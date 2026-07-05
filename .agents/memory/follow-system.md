---
name: Follow system architecture
description: Firestore schema, atomicity rules, and wiring decisions for the follow/social system in Ismail Cinema.
---

## Firestore schema

- `follows/{followerId}_{followingId}` — flat collection, doc ID is deterministic so duplicate writes are idempotent.
  Fields: `followerId`, `followingId`, `followerDisplayName`, `followerPhotoURL`, `followingDisplayName`, `followingPhotoURL`, `createdAt` (Unix ms).

- `notifications/{uid}/feed/{docId}` — subcollection per user, type=`'follow'`, fields: `fromUid`, `fromDisplayName`, `fromPhotoURL`, `createdAt` (Unix ms), `read`.

- Counters (`followersCount`, `followingCount` on `users/{uid}`) were intentionally NOT used — they diverge under concurrent writes. Real-time counts are derived from `onSnapshot` on the `follows` collection instead.

## Atomicity

- `follow()` uses `runTransaction`: checks existence of the follow doc before creating it + adds the notification in the same transaction. Idempotent.
- `unfollow()` uses `deleteDoc` (simple, non-transactional — safe because there's nothing to decrement).
- `markNotificationsRead` uses `writeBatch` with `set(ref, { read: true }, { merge: true })` — NOT `update` — so a missing/deleted doc never aborts the batch.

## Real-time subscriptions

- `FollowContext` holds two `onSnapshot` listeners per session:
  1. `where('followerId', '==', myUid)` → builds `followingIds` Set + `followingCount`.
  2. `where('followingId', '==', myUid)` → derives `followersCount`.
  3. `notifications/{uid}/feed` ordered by `createdAt desc limit 50` → notifications + unreadCount.
- All three are cleaned up in the `useEffect` return.

## Self-follow guard

- Enforced in three places: `FollowContext.follow()` (server guard), `FollowButton` (UI — returns null when `user.uid === targetUid`), and individual screens (PublicProfileScreen hides button for self, UserCard skips button).

## Navigation wiring

- Social screens (`PublicProfile`, `FollowersScreen`, `FollowingScreen`, `NotificationsScreen`) are registered via a shared `socialScreens` fragment inserted into ALL tab stacks (HomeStack, SearchStack, ContinueWatchingStack, ProfileStack).
- Screen components use typed `Props` interfaces with `route` / `navigation: any`; registered in Navigation.tsx with `component={Screen as any}` to avoid RN stack generic mismatch.

## Comment author tappable

- `CommentCard` accepts optional `onAuthorPress(uid, displayName, photoURL)`.
- In `MovieDetailsScreen`, the handler calls `navigation.push('PublicProfile', {...})`.
- Disabled (no-op) when `comment.uid === currentUid` to prevent self-navigation.

**Why:**
Counter fields diverge; flat collection with deterministic doc ID is the simplest idempotent pattern. Notification read uses set+merge after discovering that batch.update fails on deleted docs.
