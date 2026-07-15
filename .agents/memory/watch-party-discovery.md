---
name: Watch Party public discovery
description: How the Profile "All Watch Parties" list works and why it queries the top-level collection directly.
---

The top-level `watchParties` collection is readable by any authenticated user (`allow read: if isAuth()` in firestore.rules), so a public "browse and join" list does not need a `collectionGroup('members')` lookup — a direct query on `watchParties` with `where('status','in',['waiting','watching'])` is enough.

**Why:** avoids a composite index requirement (Firestore needs one for `in` + `orderBy` on a different field) — sort client-side by `createdAt` instead of adding `orderBy` to the query.

**How to apply:** `ProfileScreen.tsx`'s "All Watch Parties" section subscribes to this query and renders poster + Join button per party, navigating to `WatchParty` with `autoJoinCode` set to skip straight to joining.
