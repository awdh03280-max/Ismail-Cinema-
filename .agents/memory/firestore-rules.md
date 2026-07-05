---
name: Firestore rules file
description: Production Firestore security rules — key design decisions for correctness and security.
---

Rules live at `firestore.rules` in the repo root. Deploy: `firebase deploy --only firestore:rules`.

**Critical design decisions:**

1. **users/{uid} update uses diff().affectedKeys().hasOnly(), NOT keys().hasOnly()**
   `request.resource.data.keys()` is the full post-update document and includes immutable fields like `uid` and `createdAt` — using it denies every legitimate update. `diff(resource.data).affectedKeys()` only checks what changed.

2. **Notifications require fromUid == request.auth.uid on create**
   Notifications are written by the *follower* into the *followee's* feed. Without this check any authenticated user can spoof notifications. The `type` field is also constrained to `'follow'` and field keys are enumerated.

3. **Notifications update only allows read:true**
   `markNotificationsRead` sets `read:true` with set+merge. The rule only permits the `read` field to change and only to `true`.

**Why:** These three decisions prevent the two known attack vectors: XP/field escalation on user docs, and notification spoofing/spam.
