---
name: SplashScreen onComplete stability
description: Why SplashScreen's onComplete prop must be a stable callback reference
---

# SplashScreen onComplete Stability

## The rule
Always wrap the `onComplete` prop passed to `SplashScreen` in `useCallback` in `RootNavigator`.

**Why:** `SplashScreen` lists `onComplete` in its `useEffect` dependency array. If `onComplete` is an inline arrow function (`() => setSplashComplete(true)`), it gets a new identity on every parent re-render (e.g. when `isLoading` changes as Firebase resolves). This resets the 3.5 s `setTimeout` timer, delaying — or in pathological cases preventing — the transition to the login/main screen.

## How to apply
```tsx
const handleSplashComplete = useCallback(() => setSplashComplete(true), []);
// ...
<SplashScreen onComplete={handleSplashComplete} />
```

## Key file
- `src/navigation/Navigation.tsx` — `RootNavigator`
