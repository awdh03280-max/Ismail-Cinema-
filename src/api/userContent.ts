/**
 * userContent.ts — Firestore layer for user-generated content.
 *
 * Covers:
 *   • Favorites mirror (AsyncStorage is local; this subcollection lets
 *     other users see someone's public favorites in real-time)
 *   • Ratings (5-star per title, public read)
 *   • Public user stats subscription (users/{uid} document)
 *   • Privacy settings write
 *   • lastActive + profile field sync
 */
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  increment,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { FavoriteMovie } from '../storage/storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserRating {
  uid: string;
  movieId: string;
  contentType: 'movie' | 'tv';
  title: string;
  poster: string;
  rating: number; // 1–5
  ratedAt: number;
}

export interface UserPublicData {
  displayName: string;
  photoURL: string | null;
  xp: number;
  level: number;
  moviesWatched: number;
  seriesWatched: number;
  episodesWatched: number;
  commentsCount: number;
  ratingsCount: number;
  loginStreak: number;
  createdAt: Timestamp | number | null;
  lastActive: number | null;
  privacySettings?: {
    favoritesPublic?: boolean;
  };
}

// ── Favorites Firestore mirror ────────────────────────────────────────────────
// Subcollection: users/{uid}/favorites/{imdbID}

const favRef = (uid: string, imdbID: string) =>
  doc(db, 'users', uid, 'favorites', imdbID);

/** Write/overwrite a favorite entry to Firestore (called alongside AsyncStorage write). */
export const syncFavoriteAdd = async (
  uid: string,
  movie: FavoriteMovie,
): Promise<void> => {
  try {
    await setDoc(favRef(uid, movie.imdbID), {
      imdbID: movie.imdbID,
      title: movie.title,
      poster: movie.poster,
      contentType: movie.contentType ?? 'movie',
      addedAt: movie.addedAt,
    });
  } catch (e) {
    console.error('[userContent] syncFavoriteAdd:', e);
  }
};

/** Delete a favorite entry from Firestore (called alongside AsyncStorage removal). */
export const syncFavoriteRemove = async (
  uid: string,
  imdbID: string,
): Promise<void> => {
  try {
    await deleteDoc(favRef(uid, imdbID));
  } catch (e) {
    console.error('[userContent] syncFavoriteRemove:', e);
  }
};

/** Real-time subscription to another user's public favorites. */
export const subscribeUserFavorites = (
  uid: string,
  onUpdate: (favs: FavoriteMovie[]) => void,
): (() => void) => {
  const ref = collection(db, 'users', uid, 'favorites');
  return onSnapshot(
    ref,
    (snap) => {
      const favs: FavoriteMovie[] = snap.docs.map((d) => d.data() as FavoriteMovie);
      favs.sort((a, b) => b.addedAt - a.addedAt);
      onUpdate(favs);
    },
    () => onUpdate([]),
  );
};

// ── Ratings ───────────────────────────────────────────────────────────────────
// Collection: ratings/{uid}_{contentType}_{movieId}

const ratingId = (uid: string, contentType: string, movieId: string) =>
  `${uid}_${contentType}_${movieId}`;

const ratingRef = (uid: string, contentType: string, movieId: string) =>
  doc(db, 'ratings', ratingId(uid, contentType, movieId));

const userRef = (uid: string) => doc(db, 'users', uid);

/**
 * Add or update a rating. Automatically increments users/{uid}.ratingsCount
 * only when this is a brand-new rating (not an update to an existing one).
 */
export const addRating = async (
  uid: string,
  data: Omit<UserRating, 'uid'>,
): Promise<void> => {
  const ref = ratingRef(uid, data.contentType, data.movieId);
  const existing = await getDoc(ref);
  await setDoc(ref, { uid, ...data });
  if (!existing.exists()) {
    // New rating — increment count in user doc (merge so field is created if absent)
    await setDoc(userRef(uid), { ratingsCount: increment(1) }, { merge: true });
  }
};

/** Remove a rating. Decrements users/{uid}.ratingsCount if the doc existed. */
export const removeRating = async (
  uid: string,
  contentType: string,
  movieId: string,
): Promise<void> => {
  const ref = ratingRef(uid, contentType, movieId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await deleteDoc(ref);
    await setDoc(userRef(uid), { ratingsCount: increment(-1) }, { merge: true });
  }
};

/** Get the current logged-in user's rating for a specific title (null = not rated). */
export const getUserRating = async (
  uid: string,
  contentType: string,
  movieId: string,
): Promise<number | null> => {
  try {
    const snap = await getDoc(ratingRef(uid, contentType, movieId));
    if (!snap.exists()) return null;
    return (snap.data() as UserRating).rating;
  } catch {
    return null;
  }
};

/** Real-time subscription to all of a user's ratings. */
export const subscribeUserRatings = (
  uid: string,
  onUpdate: (ratings: UserRating[]) => void,
): (() => void) => {
  const q = query(collection(db, 'ratings'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const ratings = snap.docs.map((d) => d.data() as UserRating);
      ratings.sort((a, b) => b.ratedAt - a.ratedAt);
      onUpdate(ratings);
    },
    () => onUpdate([]),
  );
};

// ── User public data ──────────────────────────────────────────────────────────

/** Real-time subscription to a user's public profile document. */
export const subscribeUserPublicData = (
  uid: string,
  onUpdate: (data: UserPublicData | null) => void,
): (() => void) => {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) { onUpdate(null); return; }
      onUpdate(snap.data() as UserPublicData);
    },
    () => onUpdate(null),
  );
};

/** Persist privacy settings to user doc. */
export const updatePrivacySettings = async (
  uid: string,
  settings: { favoritesPublic: boolean },
): Promise<void> => {
  await setDoc(doc(db, 'users', uid), { privacySettings: settings }, { merge: true });
};

/** Update lastActive timestamp (called on app focus / stats sync). */
export const updateLastActive = async (uid: string): Promise<void> => {
  try {
    await setDoc(doc(db, 'users', uid), { lastActive: Date.now() }, { merge: true });
  } catch {
    // Non-critical — silent fail
  }
};

/** Mirror displayName + photoURL from Auth into the user doc for public profiles. */
export const syncUserProfile = async (
  uid: string,
  profile: { displayName: string; photoURL: string | null },
): Promise<void> => {
  try {
    await setDoc(doc(db, 'users', uid), profile, { merge: true });
  } catch {
    // Non-critical — silent fail
  }
};
