/**
 * useDailyReward — Daily Reward (الصندوق اليومي) logic.
 *
 * - Checks Firestore `users/{uid}.dailyReward.lastClaimAt` to enforce 24 h cooldown.
 * - Picks a weighted random reward on claim and writes it atomically.
 * - Exposes a live countdown string that refreshes every second.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useXP } from '../context/XPContext';
import { AchievementId } from '../types/achievements';

// ── Reward pool ───────────────────────────────────────────────────────────────

export type RewardKind = 'xp' | 'badge';

export interface DailyRewardResult {
  kind: RewardKind;
  xp?: number;        // for kind === 'xp'
  badgeId?: string;   // for kind === 'badge'
}

const REWARD_POOL: Array<{ weight: number; reward: DailyRewardResult }> = [
  { weight: 40, reward: { kind: 'xp', xp: 50  } },
  { weight: 25, reward: { kind: 'xp', xp: 75  } },
  { weight: 20, reward: { kind: 'xp', xp: 100 } },
  { weight: 10, reward: { kind: 'xp', xp: 150 } },
  { weight: 4,  reward: { kind: 'xp', xp: 200 } },
  { weight: 1,  reward: { kind: 'badge', badgeId: 'daily_reward_badge' } },
];

const TOTAL_WEIGHT = REWARD_POOL.reduce((s, r) => s + r.weight, 0);

function pickReward(): DailyRewardResult {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (const entry of REWARD_POOL) {
    rand -= entry.weight;
    if (rand <= 0) return entry.reward;
  }
  return REWARD_POOL[0].reward;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface DailyRewardState {
  canClaim: boolean;
  countdown: string;
  claiming: boolean;
  lastReward: DailyRewardResult | null;
  claimReward: () => Promise<DailyRewardResult | null>;
}

export function useDailyReward(): DailyRewardState {
  const { user } = useAuth();
  const { awardXP, unlockAchievement } = useXP();

  const [canClaim, setCanClaim] = useState(false);
  const [nextClaimAt, setNextClaimAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [lastReward, setLastReward] = useState<DailyRewardResult | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load last claim time ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) { setCanClaim(true); return; }
        const data = snap.data() as Record<string, any>;
        const lastClaim: number = data?.dailyReward?.lastClaimAt ?? 0;
        const next = lastClaim + TWENTY_FOUR_HOURS;
        const now = Date.now();
        if (now >= next) {
          setCanClaim(true);
          setNextClaimAt(null);
        } else {
          setCanClaim(false);
          setNextClaimAt(next);
        }
        if (data?.dailyReward?.lastReward) {
          setLastReward(data.dailyReward.lastReward as DailyRewardResult);
        }
      } catch (err) {
        console.error('[DailyReward] Failed to load:', err);
        setCanClaim(true);
      }
    };
    load();
  }, [user?.uid]);

  // ── Countdown ticker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!nextClaimAt) {
      setCountdown('');
      return;
    }

    const tick = () => {
      const remaining = nextClaimAt - Date.now();
      if (remaining <= 0) {
        setCanClaim(true);
        setNextClaimAt(null);
        setCountdown('');
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setCountdown(formatCountdown(remaining));
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextClaimAt]);

  // ── Claim ───────────────────────────────────────────────────────────────────
  const claimReward = useCallback(async (): Promise<DailyRewardResult | null> => {
    if (!user || !canClaim || claiming) return null;
    setClaiming(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const reward = pickReward();
      const now = Date.now();

      // Atomic claim: re-check cooldown inside transaction to prevent abuse
      let claimed = false;
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(userRef);
        const data = snap.exists() ? (snap.data() as Record<string, any>) : {};
        const lastClaim: number = data?.dailyReward?.lastClaimAt ?? 0;
        if (now - lastClaim < TWENTY_FOUR_HOURS) {
          return; // Already claimed — abort silently
        }
        txn.set(
          userRef,
          { dailyReward: { lastClaimAt: now, lastReward: reward } },
          { merge: true }
        );
        claimed = true;
      });

      if (!claimed) {
        // Race condition: another device claimed it first
        const freshSnap = await getDoc(userRef);
        const freshData = freshSnap.data() as Record<string, any> | undefined;
        const next = (freshData?.dailyReward?.lastClaimAt ?? now) + TWENTY_FOUR_HOURS;
        setCanClaim(false);
        setNextClaimAt(next);
        return null;
      }

      // Apply reward
      if (reward.kind === 'xp' && reward.xp) {
        await awardXP(reward.xp);
      } else if (reward.kind === 'badge' && reward.badgeId) {
        // Route through context so the unlock toast fires automatically
        await unlockAchievement(reward.badgeId as AchievementId);
      }

      setLastReward(reward);
      setCanClaim(false);
      setNextClaimAt(now + TWENTY_FOUR_HOURS);
      return reward;
    } catch (err) {
      console.error('[DailyReward] Claim failed:', err);
      return null;
    } finally {
      setClaiming(false);
    }
  }, [user, canClaim, claiming, awardXP, unlockAchievement]);

  return { canClaim, countdown, claiming, lastReward, claimReward };
}
