---
name: Public profile architecture
description: How PublicProfileScreen works — listeners, privacy, follow button props, tab structure
---

# PublicProfileScreen Architecture

## Route params
`{ uid: string; displayName: string; photoURL?: string | null }`

## Real-time listeners (5 concurrent)
1. `subscribeUserPublicData(uid)` — user doc for xp/level/stats/privacy/createdAt/lastActive
2. `onSnapshot(query(follows, where followingId==uid))` — followers count
3. `onSnapshot(query(follows, where followerId==uid))` — following count  
4. `onSnapshot(query(follows, where followerId==uid AND followingId==currentUser))` — theyFollowMe (mutual detection)
5. `subscribeUserFavorites(uid)` + `subscribeUserRatings(uid)` — tab content

## FollowButton props (required)
```tsx
<FollowButton
  targetUid={uid}
  targetDisplayName={displayName}   // required
  targetPhotoURL={photoURL}         // required
  isMutual={isMutual}
  size="md"
/>
```
**Why:** FollowButton calls `follow({ uid, displayName, photoURL })` internally — omitting displayName/photoURL causes a TypeScript error.

## Privacy gate
- `userData?.privacySettings?.favoritesPublic !== false` → if false and !isSelf → show private banner
- Default is `true` (public)

## createdAt format
- AuthContext writes `createdAt: serverTimestamp()` — a Firestore Timestamp object
- `formatJoinDate()` handles Timestamp (`.toDate()` or `.seconds * 1000`), number (Unix ms), or null

## Tabs
Favorites | Movies ★ | TV ★
- Animated gold pill indicator (spring animation)
- Favorites tab is privacy-gated
- Movies/TV tabs filter `subscribeUserRatings` results by contentType

## XP bar
Uses `xpLevelProgress(xp)` from `src/data/achievements.ts` (0-1 fraction) via `Animated.Value` interpolated to width string.
