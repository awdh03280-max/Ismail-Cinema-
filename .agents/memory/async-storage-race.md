---
name: AsyncStorage race conditions
description: Why concurrent read-modify-write calls to AsyncStorage helpers need a per-key write-lock queue.
---

AsyncStorage helpers that follow a read-JSON → modify → write-JSON pattern (favorites, continue-watching, watch-progress) can silently drop updates if two calls for the same key run concurrently — e.g. rapid taps, or a progress auto-save firing while a remove/add action is in flight. There's no built-in transactional guarantee.

**Why:** Two concurrent calls both read the same stale array, each applies its own change, and whichever write finishes last overwrites the other's change with no error or warning.

**How to apply:** Wrap mutating storage helpers (add/remove/update on the same AsyncStorage key) in a per-key write-lock queue so writes to that key are serialized. Also consider whether an update should preserve prior state (e.g. re-adding an in-progress item should keep the max watch progress rather than resetting it) and whether an update-only call should recreate a missing entry via a fallback payload instead of failing silently.
