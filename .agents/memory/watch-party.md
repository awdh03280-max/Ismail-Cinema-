---
name: Watch Party architecture
description: Firestore-based real-time watch party — collections, auth guards, and auto-navigation pattern.
---

# Watch Party Architecture

## Collections
- `watchParties/{partyId}` — root doc: code, hostUid, movieId, movieTitle, moviePoster, contentType, status ('waiting'|'watching'|'ended'), createdAt
- `watchParties/{partyId}/members/{uid}` — member presence: uid, displayName, photoURL, isHost, isReady, joinedAt
- `watchParties/{partyId}/chat/{docId}` — chat messages: uid, displayName, photoURL, text, createdAt (serverTimestamp)

## Auto-navigation (critical pattern)
All members (host AND guests) navigate to Player when `party.status === 'watching'`:
```ts
useEffect(() => {
  if (party?.status === 'watching' && screen === 'lobby' && party.movieId) {
    navigation.navigate('Player', { ... });
  }
}, [party?.status, screen]);
```
The host updates status via `updateDoc(..., { status: 'watching' })`. The Firestore onSnapshot listener fires for everyone simultaneously.

## Authorization guards
Host-only operations (start, end) must be guarded:
1. UI: hide buttons from non-hosts (`isHost = party.hostUid === user.uid`)
2. Client: explicit check before write (`if (party.hostUid !== user.uid) return;`)
3. Firestore rules: should enforce `request.auth.uid == resource.data.hostUid` for status updates

**Why:** Client UI-only guards are insufficient — any authenticated user could call `updateDoc` directly if Firestore rules are permissive.

## Navigation type
`WatchParty` is registered in `RootStackParamList` with optional movie context params. Always navigate from MovieDetailsScreen with full movie context.

## Imports
`getDocs` and `where` must be imported statically from 'firebase/firestore' — do NOT use dynamic `await import()` for Firestore functions, it causes issues with the module bundler.
