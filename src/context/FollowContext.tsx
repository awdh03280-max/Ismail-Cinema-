/**
 * FollowContext — real-time follow/unfollow system for Ismail Cinema.
 *
 * Firestore layout:
 *   follows/{followerId}_{followingId}   — FollowDoc
 *   notifications/{uid}/feed/{docId}     — NotificationDoc
 *   users/{uid}.followersCount           — counter (updated via transaction)
 *   users/{uid}.followingCount           — counter (updated via transaction)
 *
 * Does NOT touch: Movie Player, Google Sign-In, XP System, Achievements, storage.ts.
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
  collection,
  doc,
  onSnapshot,
  query,
  where,
  runTransaction,
  deleteDoc,
  getDocs,
  updateDoc,
  setDoc,
  writeBatch,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { FollowDoc, FollowUser, NotificationDoc, FollowContextType } from '../types/social';

// ── Helpers ───────────────────────────────────────────────────────────────────

const followDocId = (followerId: string, followingId: string) =>
  `${followerId}_${followingId}`;

// ── Context ───────────────────────────────────────────────────────────────────

const FollowContext = createContext<FollowContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export const FollowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const unsubFollowing = useRef<(() => void) | null>(null);
  const unsubNotifs = useRef<(() => void) | null>(null);
  const unsubUserDoc = useRef<(() => void) | null>(null);

  // ── Subscribe when authenticated ──────────────────────────────────────────
  useEffect(() => {
    // Clean up previous subscriptions
    unsubFollowing.current?.();
    unsubNotifs.current?.();
    unsubUserDoc.current?.();

    if (!user) {
      setFollowingIds(new Set());
      setFollowersCount(0);
      setFollowingCount(0);
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // ── 1. Real-time: who I'm following ─────────────────────────────────────
    const followingQ = query(
      collection(db, 'follows'),
      where('followerId', '==', user.uid)
    );
    unsubFollowing.current = onSnapshot(followingQ, (snap) => {
      const ids = new Set<string>();
      snap.docs.forEach((d) => ids.add((d.data() as FollowDoc).followingId));
      setFollowingIds(ids);
      setFollowingCount(ids.size);
      setIsLoading(false);
    }, (err) => {
      console.error('[Follow] followingQ error:', err);
      setIsLoading(false);
    });

    // ── 2. Real-time: my followers count ────────────────────────────────────
    const followersQ = query(
      collection(db, 'follows'),
      where('followingId', '==', user.uid)
    );
    unsubUserDoc.current = onSnapshot(followersQ, (snap) => {
      setFollowersCount(snap.size);
    }, (err) => {
      console.error('[Follow] followersQ error:', err);
    });

    // ── 3. Real-time: notifications ──────────────────────────────────────────
    const notifRef = collection(db, 'notifications', user.uid, 'feed');
    const notifQ = query(notifRef, orderBy('createdAt', 'desc'), limit(50));
    unsubNotifs.current = onSnapshot(notifQ, (snap) => {
      const docs: NotificationDoc[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type,
          fromUid: data.fromUid,
          fromDisplayName: data.fromDisplayName,
          fromPhotoURL: data.fromPhotoURL ?? null,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toMillis()
            : (data.createdAt ?? 0),
          read: data.read ?? false,
        } as NotificationDoc;
      });
      setNotifications(docs);
      setUnreadCount(docs.filter((n) => !n.read).length);
    }, (err) => {
      console.error('[Follow] notifQ error:', err);
    });

    return () => {
      unsubFollowing.current?.();
      unsubNotifs.current?.();
      unsubUserDoc.current?.();
    };
  }, [user?.uid]);

  // ── follow ─────────────────────────────────────────────────────────────────
  const follow = useCallback(
    async (target: { uid: string; displayName: string; photoURL: string | null }) => {
      if (!user || !userProfile) return;
      if (user.uid === target.uid) return; // prevent self-follow
      if (followingIds.has(target.uid)) return; // prevent duplicate

      const fDocId = followDocId(user.uid, target.uid);
      const fRef = doc(db, 'follows', fDocId);

      try {
        await runTransaction(db, async (txn) => {
          const existing = await txn.get(fRef);
          if (existing.exists()) return; // idempotent

          const now = Date.now();
          const followDoc: FollowDoc = {
            followerId: user.uid,
            followingId: target.uid,
            followerDisplayName: userProfile.displayName,
            followerPhotoURL: userProfile.photoURL ?? null,
            followingDisplayName: target.displayName,
            followingPhotoURL: target.photoURL,
            createdAt: now,
          };
          txn.set(fRef, followDoc);

          // Notification for the target user
          const notifRef = doc(
            collection(db, 'notifications', target.uid, 'feed')
          );
          txn.set(notifRef, {
            type: 'follow',
            fromUid: user.uid,
            fromDisplayName: userProfile.displayName,
            fromPhotoURL: userProfile.photoURL ?? null,
            createdAt: now,
            read: false,
          });
        });
      } catch (err) {
        console.error('[Follow] follow error:', err);
        throw err;
      }
    },
    [user, userProfile, followingIds]
  );

  // ── unfollow ───────────────────────────────────────────────────────────────
  const unfollow = useCallback(
    async (targetUid: string) => {
      if (!user) return;
      const fDocId = followDocId(user.uid, targetUid);
      const fRef = doc(db, 'follows', fDocId);
      try {
        await deleteDoc(fRef);
      } catch (err) {
        console.error('[Follow] unfollow error:', err);
        throw err;
      }
    },
    [user]
  );

  // ── helpers ────────────────────────────────────────────────────────────────
  const isFollowing = useCallback(
    (uid: string) => followingIds.has(uid),
    [followingIds]
  );

  const isMutual = useCallback(
    (uid: string, theirFollowingIds?: Set<string>) => {
      // I follow them AND they follow me
      const theyFollowMe = theirFollowingIds?.has(user?.uid ?? '') ?? false;
      return followingIds.has(uid) && theyFollowMe;
    },
    [followingIds, user?.uid]
  );

  // ── mark all notifications read ───────────────────────────────────────────
  const markNotificationsRead = useCallback(async () => {
    if (!user || unreadCount === 0) return;
    try {
      const batch = writeBatch(db);
      const unread = notifications.filter((n) => !n.read);
      // Use set+merge so a missing/deleted doc never aborts the whole batch
      unread.forEach((n) => {
        const ref = doc(db, 'notifications', user.uid, 'feed', n.id);
        batch.set(ref, { read: true }, { merge: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('[Follow] markNotificationsRead error:', err);
    }
  }, [user, notifications, unreadCount]);

  return (
    <FollowContext.Provider
      value={{
        followingIds,
        followersCount,
        followingCount,
        notifications,
        unreadCount,
        isFollowing,
        isMutual,
        follow,
        unfollow,
        markNotificationsRead,
        isLoading,
      }}
    >
      {children}
    </FollowContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useFollow = (): FollowContextType => {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error('useFollow must be used inside FollowProvider');
  return ctx;
};

// ── Utility: fetch followers/following lists on demand ─────────────────────

/** Returns the list of users who follow {uid} (followers) */
export const fetchFollowers = async (uid: string): Promise<FollowUser[]> => {
  try {
    const q = query(collection(db, 'follows'), where('followingId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as FollowDoc;
      return {
        uid: data.followerId,
        displayName: data.followerDisplayName,
        photoURL: data.followerPhotoURL,
        followedAt: data.createdAt,
      };
    }).sort((a, b) => b.followedAt - a.followedAt);
  } catch (err) {
    console.error('[Follow] fetchFollowers error:', err);
    return [];
  }
};

/** Returns the list of users that {uid} follows */
export const fetchFollowing = async (uid: string): Promise<FollowUser[]> => {
  try {
    const q = query(collection(db, 'follows'), where('followerId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as FollowDoc;
      return {
        uid: data.followingId,
        displayName: data.followingDisplayName,
        photoURL: data.followingPhotoURL,
        followedAt: data.createdAt,
      };
    }).sort((a, b) => b.followedAt - a.followedAt);
  } catch (err) {
    console.error('[Follow] fetchFollowing error:', err);
    return [];
  }
};

/** Fetch the FollowingIds set for any user (for mutual detection on public profile) */
export const fetchFollowingIds = async (uid: string): Promise<Set<string>> => {
  try {
    const q = query(collection(db, 'follows'), where('followerId', '==', uid));
    const snap = await getDocs(q);
    const ids = new Set<string>();
    snap.docs.forEach((d) => ids.add((d.data() as FollowDoc).followingId));
    return ids;
  } catch {
    return new Set();
  }
};

// ── Utility: invite a friend to a Watch Party (in-app, no OS share sheet) ──

interface WatchPartyInviteInput {
  fromUid: string;
  fromDisplayName: string;
  fromPhotoURL: string | null;
  toUid: string;
  partyId: string;
  partyCode: string;
  movieId: string;
  movieTitle: string;
  moviePoster: string;
  contentType: 'movie' | 'tv';
}

/** Writes a `watch_party_invite` notification directly into the target user's feed. */
export const sendWatchPartyInvite = async (input: WatchPartyInviteInput): Promise<void> => {
  const notifRef = doc(collection(db, 'notifications', input.toUid, 'feed'));
  await setDoc(notifRef, {
    type: 'watch_party_invite',
    fromUid: input.fromUid,
    fromDisplayName: input.fromDisplayName,
    fromPhotoURL: input.fromPhotoURL,
    createdAt: Date.now(),
    read: false,
    partyId: input.partyId,
    partyCode: input.partyCode,
    movieId: input.movieId,
    movieTitle: input.movieTitle,
    moviePoster: input.moviePoster,
    contentType: input.contentType,
  });
};
