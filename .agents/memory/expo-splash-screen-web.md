---
name: expo-splash-screen on web
description: SplashScreen.preventAutoHideAsync() blocks web rendering when called without a proper web splash setup.
---

**Rule:** Do not call `SplashScreen.preventAutoHideAsync()` in projects that target Expo web unless the web splash is properly configured and `hideAsync()` is reliably called.

**Why:** On web, expo-splash-screen overlays a div on the root. If `preventAutoHideAsync()` is called but `hideAsync()` fails silently (e.g. missing splash image in app.json, or the call runs before the overlay is set up), the div stays and the app renders invisible (blank white screen).

**How to apply:** If the project uses a custom animated React component as its splash screen (not expo-splash-screen's native overlay), remove the `SplashScreen` API calls from App.tsx entirely. The custom splash component handles the visual transition.

Projects that need the native splash for App Store builds should gate these calls with `Platform.OS !== 'web'`.
