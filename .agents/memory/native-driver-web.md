---
name: useNativeDriver on web
description: How to correctly set useNativeDriver in a cross-platform Expo project to avoid RN Web warnings.
---

React Native Web does not have the native animation driver. Any `useNativeDriver: true` call prints a console warning on web and falls back to JS animation.

**Fix:** Use `ND` from `src/utils/animation.ts` instead of hardcoded `true`.

```ts
import { ND } from '../utils/animation';
Animated.timing(val, { toValue: 1, duration: 300, useNativeDriver: ND }).start();
```

**Why:** `ND = Platform.OS !== 'web'` — true on iOS/Android, false on web. Animations still run on all platforms, no warning.

**How to apply:** Every `Animated.*` call in the codebase. SplashScreen uses a spread `...ND` pattern because it pre-computes the object once per animation sequence.
