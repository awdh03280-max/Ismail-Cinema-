---
name: Family Mode cert filter
description: How Family Mode blocks content beyond the TMDB adult flag.
---

Family Mode filtering in `src/context/FamilyModeContext.tsx` uses two signals:
1. `movie.adult === true` — TMDB's explicit adult flag
2. `movie.certification` in `BLOCKED_CERTS` — NC-17, X, XXX, TV-MA

`BLOCKED_CERTS` is a module-level `Set<string>` (not inside useCallback) to avoid recreation on every render.

**Why:** Many explicitly mature films on TMDB are not flagged `adult: true`. The certification field provides a secondary safety net.

**How to apply:** If new content categories need blocking (e.g. NR, Unrated), add them to `BLOCKED_CERTS`. The `isAdultContent` helper is used both in `filterMovies` and can be called individually for pre-navigation guards.
