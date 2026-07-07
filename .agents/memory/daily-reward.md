---
name: Daily Reward architecture
description: Key design decisions for the الصندوق اليومي feature
---

# Daily Reward (الصندوق اليومي)

## Firestore shape
`users/{uid}.dailyReward: { lastClaimAt: number, lastReward: DailyRewardResult }`

## Cooldown
- Enforced atomically inside `runTransaction` — re-checks `lastClaimAt + 24h > now` before writing.
- On race condition (another device claimed first), UI resets to idle+countdown state.

## Reward pool (weighted)
40% → +50 XP, 25% → +75 XP, 20% → +100 XP, 10% → +150 XP, 4% → +200 XP, 1% → badge

## Badge reward
- Unlocks `daily_reward_badge` achievement via a second Firestore transaction (idempotent — skips if already present).
- `daily_reward_badge` added to `AchievementId` type, `ACHIEVEMENTS` array (category: 'streak'), and `AchievementsScreen` stat map.

## awardXP in context
- `awardXP` was previously internal to XPContext. It is now part of `XPContextType` and exposed in the provider value so external hooks can call it.

## AchievementsScreen stat map
- Changed from `Record<AchievementId, number>` to `Partial<Record<AchievementId, number>>` to accommodate achievements that have no numeric progress (daily_reward_badge has value 0).
