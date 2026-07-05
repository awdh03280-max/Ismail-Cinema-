---
name: XP dedup per session
description: How XP farming via repeated Watch Now taps is prevented.
---

`trackContentWatched` in `XPContext` accepts an optional `imdbID` param. When provided, it checks the `watchedThisSession` ref (a `Set<string>` on the context) before awarding XP/stats — if the ID is already in the set, the call returns immediately.

**Why:** Without dedup, each "Watch Now" tap triggers an XP increment. The per-session set prevents same-title inflation within one app session.

**How to apply:** Always pass `imdbID: movieId` when calling `trackContentWatched` from any screen.

**Known limitation:** Dedup is session-scoped (in-memory), not persistent. A user who restarts the app can re-earn XP for the same title. The correct long-term fix is to move the award trigger from the button press to a meaningful playback threshold in PlayerScreen (e.g., 15 minutes or 25% of runtime).
