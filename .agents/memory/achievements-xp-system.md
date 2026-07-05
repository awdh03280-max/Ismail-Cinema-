---
name: Achievements & XP System
description: Architecture decisions for the achievements/XP system added to Ismail Cinema.
---

# Achievements & XP System

## Rule: Atomic unlocks via runTransaction
Achievement unlocking uses `runTransaction` in Firestore (`XPContext.maybeUnlock`).
The transaction re-reads `achievements.{id}` server-side before writing, preventing concurrent calls from double-awarding XP.

**Why:** Without a transaction, two rapid events (e.g. comment + XP award) could both pass the local Set check and both increment XP.

**How to apply:** Any future unlock path must go through `maybeUnlock`, never `updateDoc` directly.

## Rule: Level achievements award 0 XP
`level_10` through `level_150` all have `xpReward: 0`.

**Why:** Awarding XP for level milestones would trigger `checkLevelAchievements` recursively, causing cascading level-ups.

**How to apply:** Never add XP rewards to level-based achievements.

## Rule: Firestore schema is additive to users/{uid}
Stats (`moviesWatched`, etc.), `xp`, `loginStreak`, `lastLoginDate`, and the `achievements` map are all top-level fields on the existing `users/{uid}` document — merged via `increment()` and `updateDoc`. No new collection needed.

## XP formula
- `XP_PER_LEVEL = 500` (in `src/data/achievements.ts`)
- `level = Math.floor(xp / 500) + 1`
- Base XP per action: movie watched = 50, series = 30, episode = 20, comment = 10

## Trigger hookup
- `trackContentWatched` called in `MovieDetailsScreen.handleWatchNow` (fire-and-forget)
- `trackComment` called in `MovieDetailsScreen.handlePostComment` after Firestore write
- Login streak checked in `XPContext` on mount (when user is non-null)
- Do NOT call trackers from inside PlayerScreen or storage.ts

## Toast animation
- `AchievementUnlockToast` uses a queue (`pendingUnlocks[]` in XPContext)
- Shimmer loop stored in `shimmerLoopRef` and stopped on cleanup to prevent animation leaks
- All animations use `useNativeDriver: false` for Expo web compatibility
