---
name: Google Sign-In native setup
description: How native Google Sign-In is implemented with expo-auth-session for Ismail Cinema
---

# Google Sign-In Native Setup

## The rule
Use `expo-auth-session/providers/google` → `useIdTokenAuthRequest` for native Google Sign-In. The hook lives in `src/hooks/useGoogleAuth.ts`. Web uses `signInWithPopup`, native uses the hook's `promptAsync()` → Firebase `signInWithCredential(GoogleAuthProvider.credential(idToken))`.

**Why:** `@react-native-google-signin/google-signin` requires a dev build. `expo-auth-session` works in Expo Go and managed workflow.

## How to apply
- `webClientId` is required. `androidClientId` and `iosClientId` are optional; when absent, both default to `webClientId`, which works in Expo Go via the Expo auth proxy.
- For production standalone builds, register separate OAuth apps in Google Cloud Console and set `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
- `scheme: "ismailcinema"` must be in `app.json` for the OAuth redirect to return to the app.
- `WebBrowser.maybeCompleteAuthSession()` must be called at module level (in the hook file) — required on Android to dismiss the browser tab.
- `signInWithGoogleCredential` in AuthContext must be wrapped in `useCallback([])` so the hook's useEffect dependency is stable and doesn't re-process responses on re-renders.
- A `handledRef` guard prevents duplicate credential sign-in from stale re-renders.

## Key files
- `src/hooks/useGoogleAuth.ts` — hook
- `src/context/AuthContext.tsx` — `signInWithGoogleCredential`
- `src/config/firebase.ts` — `signInWithCredential` import
- `app.json` — `scheme: "ismailcinema"`
