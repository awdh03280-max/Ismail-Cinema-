---
name: Firebase Auth implementation
description: How Firebase Authentication is wired into Ismail Cinema — init, context, nav, persistence.
---

# Firebase Auth — Ismail Cinema

## Stack
- Firebase JS SDK v9+ (modular), NOT react-native-firebase
- `src/config/firebase.ts` — init with `getApps()` guard; native uses `initializeAuth + getReactNativePersistence(AsyncStorage)`, web uses `getAuth(app)` (default browserLocalPersistence)
- `src/context/AuthContext.tsx` — `AuthProvider` + `useAuth` hook; `onAuthStateChanged` drives all routing

## Auth methods
- Email/Password: `createUserWithEmailAndPassword` / `signInWithEmailAndPassword`
- Google: `signInWithPopup(auth, new GoogleAuthProvider())` — **web only**; native shows an Alert
- Forgot password: `sendPasswordResetEmail`
- Logout: `signOut(auth)`

## Firestore profile
- Collection: `users/{uid}`
- Fields: `uid, email, displayName, photoURL, provider, createdAt, updatedAt`
- `ensureUserProfile()` — creates on first login, merges on every subsequent login
- Provider derived from `fbUser.providerData[0]?.providerId` (never hardcoded)

## Navigation routing
- `RootNavigator` uses `splashComplete + isLoading` state to gate routing
- `SplashScreen` accepts `onComplete` prop (not `navigation.replace`) — signals animation done
- Switches: `Splash → Auth (AuthStack) → MainApp` or `Splash → MainApp` if session restores

## Provider wrapping order in App.tsx
`<AuthProvider> → <FamilyModeProvider> → <I18nextProvider> → <Navigation>`

## Required Firebase Console setup
1. Authentication → Sign-in method: enable Email/Password AND Google
2. Authentication → Settings → Authorized domains: add `*.replit.dev` and `*.replit.app` for Google signInWithPopup to work in the Replit preview
3. Firestore → Rules: allow users to read/write their own `users/{uid}` document

**Why:** Firebase `signInWithPopup` validates that the calling domain is in the authorized list. Replit preview domains are not added by default.

## Env vars (EXPO_PUBLIC_ → public client-side bundle)
- EXPO_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID
- All set in `.replit` [userenv.shared]
