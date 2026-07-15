---
name: Ratings & user content Firestore
description: How ratings, favorites mirroring, privacy, and lastActive are stored and synced via src/api/userContent.ts
---

# Ratings & User Content (src/api/userContent.ts)

## Ratings
- **Collection:** `ratings`
- **Doc ID:** `{uid}_{contentType}_{movieId}` (e.g. `abc123_movie_tt1234567`)
- **Fields:** `uid`, `movieId`, `contentType`, `title`, `poster`, `rating` (1–5), `ratedAt` (Unix ms)
- `addRating` checks if doc exists before setDoc; if new → increments `users/{uid}.ratingsCount` via `setDoc(merge:true)`
- `removeRating` decrements `ratingsCount` only if doc existed
- `subscribeUserRatings(uid, cb)` — real-time onSnapshot, sorted by ratedAt desc

## Favorites Firestore mirror
- **Subcollection:** `users/{uid}/favorites/{imdbID}`
- AsyncStorage remains the local source of truth; Firestore is the public mirror for other users to read
- `syncFavoriteAdd` / `syncFavoriteRemove` called from MovieDetailsScreen alongside AsyncStorage ops
- `subscribeUserFavorites(uid, cb)` — real-time onSnapshot, sorted by addedAt desc

## Privacy
- Field `users/{uid}.privacySettings.favoritesPublic` (boolean, default true)
- Written via `updatePrivacySettings(uid, { favoritesPublic })` using `setDoc(merge:true)`
- ProfileScreen loads it on mount and exposes a Switch toggle

## lastActive
- Stamped as Unix ms on `users/{uid}.lastActive`
- Written in XPContext `load()` and `syncStats()` via `updateDoc`
- Also available via `updateLastActive(uid)` helper in userContent.ts

## User doc mirror (displayName/photoURL)
- XPContext `load()` patches missing displayName/photoURL from Firebase Auth into user doc
- Needed so PublicProfileScreen can read them without a separate Auth lookup

**Why:** Ratings and favorites need to be readable by other users' public profiles; AsyncStorage is device-local and can't be queried cross-user.
