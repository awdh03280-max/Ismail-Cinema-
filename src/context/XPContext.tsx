/**
 * XPContext — XP, leveling, and achievements for Ismail Cinema.
 *
 * All data persisted in Firestore under users/{uid}:
 *   xp, level, stats (moviesWatched, commentsCount, etc.), achievements map.
 *
 * Does NOT modify: Movie Player, Google Sign-In, Firebase Auth, storage.ts.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import {
  Achievement,
  AchievementId,
  AchievementRecord,
  UserStats,
  XPContextType,
} from '../types/achievements';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  XP_PER_LEVEL,
  xpToLevel,
  xpLevelProgress,
} from '../data/achievements';

// ── Helpers ───────────────────────────────────────────────────────────────────

const todayDateStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DEFAULT_STATS: UserStats = {
  xp: 0,
  level: 1,
  moviesWatched: 0,
  seriesWatched: 0,
  episodesWatched: 0,
  commentsCount: 0,
  animeWatched: 0,
  animationWatched: 0,
  loginStreak: 0,
  lastLoginDate: '',
};

// ── Context ───────────────────────────────────────────────────────────────────

export interface PendingUnlock {
  achievement: Achievement;
  xpAwarded: number;
}

interface XPContextInternal extends XPContextType {
  pendingUnlocks: PendingUnlock[];
  dismissUnlock: () => void;
  achievementDates: Partial<Record<AchievementId, number>>;
}

const XPContext = createContext<XPContextInternal | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export const XPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [unlockedIds, setUnlockedIds] = useState<Set<AchievementId>>(new Set());
  const [achievementDates, setAchievementDates] = useState<Partial<Record<AchievementId, number>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUnlocks, setPendingUnlocks] = useState<PendingUnlock[]>([]);

  // Track watched imdbIDs to avoid double-counting in the same session
  const watchedThisSession = useRef<Set<string>>(new Set());

  const userRef = user ? doc(db, 'users', user.uid) : null;

  // ── Load user data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !userRef) {
      setXp(0);
      setLevel(1);
      setStats(DEFAULT_STATS);
      setUnlockedIds(new Set());
      setAchievementDates({});
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          setIsLoading(false);
          return;
        }
        const data = snap.data() as any;

        const storedXp: number = data.xp ?? 0;
        const storedStats: UserStats = {
          xp: storedXp,
          level: xpToLevel(storedXp),
          moviesWatched: data.moviesWatched ?? 0,
          seriesWatched: data.seriesWatched ?? 0,
          episodesWatched: data.episodesWatched ?? 0,
          commentsCount: data.commentsCount ?? 0,
          animeWatched: data.animeWatched ?? 0,
          animationWatched: data.animationWatched ?? 0,
          loginStreak: data.loginStreak ?? 0,
          lastLoginDate: data.lastLoginDate ?? '',
        };

        const achievementsMap: Record<string, any> = data.achievements ?? {};
        const ids = new Set<AchievementId>(
          Object.keys(achievementsMap) as AchievementId[]
        );
        // Build dates map from stored records
        const dates: Partial<Record<AchievementId, number>> = {};
        for (const [id, record] of Object.entries(achievementsMap)) {
          if (record?.unlockedAt) dates[id as AchievementId] = record.unlockedAt;
        }

        setXp(storedXp);
        setLevel(xpToLevel(storedXp));
        setStats(storedStats);
        setUnlockedIds(ids);
        setAchievementDates(dates);

        // Update login streak on load
        await checkLoginStreak(storedStats, ids, storedXp);

      } catch (err) {
        console.error('[XP] Failed to load user data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ── Login streak ───────────────────────────────────────────────────────────
  const checkLoginStreak = useCallback(
    async (
      currentStats: UserStats,
      currentIds: Set<AchievementId>,
      currentXp: number
    ) => {
      if (!userRef) return;
      const today = todayDateStr();
      if (currentStats.lastLoginDate === today) return; // already logged today

      const yesterday = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();

      const newStreak =
        currentStats.lastLoginDate === yesterday
          ? currentStats.loginStreak + 1
          : 1;

      try {
        await updateDoc(userRef, {
          loginStreak: newStreak,
          lastLoginDate: today,
        });
        const newStats = { ...currentStats, loginStreak: newStreak, lastLoginDate: today };
        setStats(newStats);

        // Check streak achievements
        const toCheck: AchievementId[] =
          newStreak >= 30 ? ['streak_7', 'streak_30'] :
          newStreak >= 7  ? ['streak_7'] : [];

        for (const id of toCheck) {
          await maybeUnlock(id, currentIds, currentXp, newStats);
        }
      } catch (err) {
        console.error('[XP] Failed to update login streak:', err);
      }
    },
    [userRef]
  );

  // ── Award XP ───────────────────────────────────────────────────────────────
  const awardXP = useCallback(
    async (amount: number): Promise<number> => {
      if (!userRef || amount <= 0) return xp;
      try {
        await updateDoc(userRef, { xp: increment(amount) });
        const newXp = xp + amount;
        const newLevel = xpToLevel(newXp);
        setXp(newXp);
        setLevel(newLevel);
        setStats(s => ({ ...s, xp: newXp, level: newLevel }));
        return newXp;
      } catch (err) {
        console.error('[XP] Failed to award XP:', err);
        return xp;
      }
    },
    [userRef, xp]
  );

  // ── Unlock achievement (atomic via Firestore transaction) ─────────────────
  // runTransaction re-reads the doc inside the transaction so concurrent calls
  // can't both pass the "already unlocked?" check and double-award XP.
  const maybeUnlock = useCallback(
    async (
      id: AchievementId,
      currentIds: Set<AchievementId>,
      currentXp: number,
      currentStats?: UserStats
    ): Promise<{ newXp: number; newIds: Set<AchievementId> }> => {
      if (currentIds.has(id) || !userRef) {
        return { newXp: currentXp, newIds: currentIds };
      }
      const achievement = ACHIEVEMENT_MAP.get(id);
      if (!achievement) return { newXp: currentXp, newIds: currentIds };

      try {
        let actuallyUnlocked = false;
        let xpAfterTransaction = currentXp;

        await runTransaction(db, async (txn) => {
          const snap = await txn.get(userRef);
          if (!snap.exists()) return;
          const data = snap.data() as any;

          // Server-side idempotency check
          if (data.achievements?.[id]) return;

          const record: AchievementRecord = {
            unlockedAt: Date.now(),
            xpAwarded: achievement.xpReward,
          };
          const updates: any = { [`achievements.${id}`]: record };
          if (achievement.xpReward > 0) {
            updates.xp = increment(achievement.xpReward);
            xpAfterTransaction = (data.xp ?? 0) + achievement.xpReward;
          }
          txn.update(userRef, updates);
          actuallyUnlocked = true;
        });

        if (!actuallyUnlocked) {
          // Another concurrent call already wrote it — just update local state
          const newIds = new Set(currentIds);
          newIds.add(id);
          setUnlockedIds(newIds);
          return { newXp: currentXp, newIds };
        }

        const newIds = new Set(currentIds);
        newIds.add(id);
        setUnlockedIds(newIds);
        // Record the unlock timestamp locally
        const unlockedAt = Date.now();
        setAchievementDates(prev => ({ ...prev, [id]: unlockedAt }));

        if (achievement.xpReward > 0) {
          const newLevel = xpToLevel(xpAfterTransaction);
          setXp(xpAfterTransaction);
          setLevel(newLevel);
          if (currentStats) {
            setStats(s => ({ ...s, xp: xpAfterTransaction, level: newLevel }));
          }
        }

        // Queue the unlock toast
        setPendingUnlocks(q => [...q, { achievement, xpAwarded: achievement.xpReward }]);

        return { newXp: xpAfterTransaction, newIds };
      } catch (err) {
        console.error(`[XP] Failed to unlock achievement ${id}:`, err);
        return { newXp: currentXp, newIds: currentIds };
      }
    },
    [userRef]
  );

  // ── Check level achievements ───────────────────────────────────────────────
  const checkLevelAchievements = useCallback(
    async (currentLevel: number, currentIds: Set<AchievementId>, currentXp: number) => {
      const levelMilestones: Array<{ id: AchievementId; target: number }> = [
        { id: 'level_10', target: 10 },
        { id: 'level_25', target: 25 },
        { id: 'level_50', target: 50 },
        { id: 'level_100', target: 100 },
        { id: 'level_150', target: 150 },
      ];
      let ids = currentIds;
      let curXp = currentXp;
      for (const { id, target } of levelMilestones) {
        if (currentLevel >= target && !ids.has(id)) {
          const result = await maybeUnlock(id, ids, curXp);
          ids = result.newIds;
          curXp = result.newXp;
        }
      }
    },
    [maybeUnlock]
  );

  // ── Track content watched ──────────────────────────────────────────────────
  const trackContentWatched = useCallback(
    async ({
      contentType,
      genres = [],
      isNewEpisode = false,
    }: {
      contentType: 'movie' | 'tv';
      genres?: string[];
      isNewEpisode?: boolean;
    }): Promise<void> => {
      if (!userRef || !user) return;

      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) return;
        const data = snap.data() as any;

        const currentIds = new Set<AchievementId>(
          Object.keys(data.achievements ?? {}) as AchievementId[]
        );
        let currentXp: number = data.xp ?? 0;
        let ids = currentIds;

        const genresLower = genres.map(g => g.toLowerCase());
        const isAnime = genresLower.some(g => g.includes('anime'));
        const isAnimation = genresLower.some(g => g.includes('animation'));

        // Build increments
        const increments: any = {};
        if (contentType === 'movie') {
          increments.moviesWatched = increment(1);
        } else {
          if (isNewEpisode) {
            increments.episodesWatched = increment(1);
          } else {
            increments.seriesWatched = increment(1);
          }
        }
        if (isAnime) increments.animeWatched = increment(1);
        if (isAnimation) increments.animationWatched = increment(1);

        await updateDoc(userRef, increments);

        // Refresh stats
        const freshSnap = await getDoc(userRef);
        const freshData = freshSnap.data() as any;
        const freshStats: UserStats = {
          xp: freshData.xp ?? 0,
          level: xpToLevel(freshData.xp ?? 0),
          moviesWatched: freshData.moviesWatched ?? 0,
          seriesWatched: freshData.seriesWatched ?? 0,
          episodesWatched: freshData.episodesWatched ?? 0,
          commentsCount: freshData.commentsCount ?? 0,
          animeWatched: freshData.animeWatched ?? 0,
          animationWatched: freshData.animationWatched ?? 0,
          loginStreak: freshData.loginStreak ?? 0,
          lastLoginDate: freshData.lastLoginDate ?? '',
        };
        setStats(freshStats);

        // Check achievements
        if (contentType === 'movie') {
          const mv = freshStats.moviesWatched;
          const checks: AchievementId[] =
            mv >= 100 ? ['first_movie', 'movies_10', 'movies_50', 'movies_100'] :
            mv >= 50  ? ['first_movie', 'movies_10', 'movies_50'] :
            mv >= 10  ? ['first_movie', 'movies_10'] :
            mv >= 1   ? ['first_movie'] : [];
          for (const id of checks) {
            const result = await maybeUnlock(id, ids, currentXp);
            ids = result.newIds;
            currentXp = result.newXp;
          }
        } else {
          // series
          const sv = freshStats.seriesWatched;
          if (sv >= 1) {
            const result = await maybeUnlock('first_series', ids, currentXp);
            ids = result.newIds;
            currentXp = result.newXp;
          }
          const ev = freshStats.episodesWatched;
          if (ev >= 50) {
            const result = await maybeUnlock('episodes_50', ids, currentXp);
            ids = result.newIds;
            currentXp = result.newXp;
          }
        }

        if (isAnime && freshStats.animeWatched >= 5) {
          const result = await maybeUnlock('anime_fan', ids, currentXp);
          ids = result.newIds;
          currentXp = result.newXp;
        }
        if (isAnimation && freshStats.animationWatched >= 5) {
          const result = await maybeUnlock('animation_fan', ids, currentXp);
          ids = result.newIds;
          currentXp = result.newXp;
        }

        // Award base XP for watching
        const baseXp = contentType === 'movie' ? 50 : isNewEpisode ? 20 : 30;
        const newXpTotal = await awardXP(baseXp);
        const newLevel = xpToLevel(newXpTotal);
        await checkLevelAchievements(newLevel, ids, newXpTotal);
      } catch (err) {
        console.error('[XP] trackContentWatched error:', err);
      }
    },
    [userRef, user, maybeUnlock, awardXP, checkLevelAchievements]
  );

  // ── Track comment posted ───────────────────────────────────────────────────
  const trackComment = useCallback(async (): Promise<void> => {
    if (!userRef || !user) return;
    try {
      await updateDoc(userRef, { commentsCount: increment(1) });

      const snap = await getDoc(userRef);
      const data = snap.data() as any;
      const count: number = data.commentsCount ?? 0;
      const currentIds = new Set<AchievementId>(
        Object.keys(data.achievements ?? {}) as AchievementId[]
      );
      let currentXp: number = data.xp ?? 0;
      let ids = currentIds;

      setStats(s => ({ ...s, commentsCount: count }));

      const checks: AchievementId[] =
        count >= 100 ? ['first_comment', 'comments_10', 'comments_100'] :
        count >= 10  ? ['first_comment', 'comments_10'] :
        count >= 1   ? ['first_comment'] : [];

      for (const id of checks) {
        const result = await maybeUnlock(id, ids, currentXp);
        ids = result.newIds;
        currentXp = result.newXp;
      }

      // Award XP for commenting
      const newXpTotal = await awardXP(10);
      const newLevel = xpToLevel(newXpTotal);
      await checkLevelAchievements(newLevel, ids, newXpTotal);
    } catch (err) {
      console.error('[XP] trackComment error:', err);
    }
  }, [userRef, user, maybeUnlock, awardXP, checkLevelAchievements]);

  // ── Dismiss top unlock toast ───────────────────────────────────────────────
  const dismissUnlock = useCallback(() => {
    setPendingUnlocks(q => q.slice(1));
  }, []);

  const xpToNextLevel = XP_PER_LEVEL - (xp % XP_PER_LEVEL);
  const xpProgress = xpLevelProgress(xp);

  return (
    <XPContext.Provider
      value={{
        xp,
        level,
        xpToNextLevel,
        xpProgress,
        stats,
        unlockedIds,
        achievementDates,
        allAchievements: ACHIEVEMENTS,
        trackContentWatched,
        trackComment,
        isLoading,
        pendingUnlocks,
        dismissUnlock,
      }}
    >
      {children}
    </XPContext.Provider>
  );
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export const useXP = (): XPContextInternal => {
  const ctx = useContext(XPContext);
  if (!ctx) throw new Error('useXP must be used inside XPProvider');
  return ctx;
};

export const useXPPublic = (): XPContextType => useXP();
