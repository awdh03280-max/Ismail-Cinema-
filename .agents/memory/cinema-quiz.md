---
name: Cinema Quiz architecture
description: Key design decisions for the اختبر ذاكرتك السينمائية feature
---

# Cinema Quiz (اختبر ذاكرتك السينمائية)

**Why:** Questions come from the user's watched history, which lives in AsyncStorage (not Firestore), so the hook must load both getContinueWatching() and getFavorites() then fetch TMDB details per title to get rich metadata (Director, Cast, Genre, Year, Rating, Country).

## Cooldown enforcement
- Checked at init (getDoc read) AND inside the Firestore submission transaction.
- Transaction throws `Object.assign(new Error('ALREADY_DONE'), { code: 'ALREADY_DONE' })` when `lastQuizAt + 24h > now`.
- Catch discriminates by both `err.code` and `err.message` for safety.
- ALREADY_DONE recovery `getDoc` is wrapped in try/finally to guarantee `submittingRef.current` reset.

## Double-submit prevention
- `submittingRef` (useRef<boolean>) set to true before any async work, reset on every exit path.
- UI also has a `tappedIndex` guard that disables options after first tap and shows green/red feedback for 800ms before calling `submitAnswer`.

## resetQuiz
- Increments `resetKey` state — the init useEffect depends on `[user?.uid, resetKey]`, triggering full re-initialisation including re-fetching Firestore cooldown and rebuilding the question pool.
- Does NOT manually reset questions/answers — those are set inside the effect.

## Question generation
- Two-pass: pass 1 = one question per movie (shuffled templates), pass 2 = fill remaining slots with extra templates.
- Uses a `used` Set keyed `${imdbID}_${templateType}` to prevent duplicate questions.
- Minimum 4 valid movies required; minimum 4 questions to proceed.
- Answers array sized to `qs.length`, not hardcoded 10.

## Firestore write shape
`users/{uid}.cinemaQuiz: { lastQuizAt, lastScore, totalQuizzes, bestScore }`

## XP table
0→5, 1→10, 2→15, 3→25, 4→35, 5→50, 6→60, 7→75, 8→90, 9→105, 10→120
