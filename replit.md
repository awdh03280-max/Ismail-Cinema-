# Ismail Cinema

A Netflix-style React Native/Expo movie application with Arabic and English support.

## Stack
- React Native + Expo SDK 50 (web + Android + iOS)
- TypeScript
- React Navigation (bottom tabs + native stack)
- Firebase Auth + Firestore (authentication + user profiles)
- expo-auth-session (native Google Sign-In OAuth flow)
- TMDB API for movie metadata
- react-native-webview for in-app video streaming
- AsyncStorage for favorites, continue watching, playback progress, and auth persistence
- i18next / react-i18next for EN/AR localization

## How to run

```bash
# Expo web (browser preview on Replit)
npm run web

# Android (requires Expo Go or emulator)
npm run android
```

The configured workflow runs `npx expo start --web --port 5000` and opens the app in the Replit preview pane.

## Auth system

Authentication is implemented in:
- `src/config/firebase.ts` — Firebase initialization; web uses `browserLocalPersistence`, native uses `AsyncStorage` persistence
- `src/context/AuthContext.tsx` — `AuthProvider` with `onAuthStateChanged` session restore, email/password + Google sign-in, Firestore profile creation
- `src/hooks/useGoogleAuth.ts` — cross-platform Google Sign-In hook; web=`signInWithPopup`, native=`expo-auth-session` OAuth → `signInWithCredential`
- `src/screens/auth/LoginScreen.tsx` / `SignUpScreen.tsx` / `ForgotPasswordScreen.tsx`
- `src/navigation/Navigation.tsx` — auth-aware routing; splash gates on Firebase resolving (`isLoading`)

**Session restore**: `onAuthStateChanged` fires on startup; `isLoading` gates navigation until Firebase resolves. Native sessions persist via AsyncStorage.

**Google Sign-In (native)**: Uses `expo-auth-session/providers/google` → `useIdTokenAuthRequest`. Falls back to `webClientId` when platform-specific IDs (`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`) are not provided (works in Expo Go via Expo auth proxy).

## Project structure

```
App.tsx                     Entry point — i18n + AuthProvider + Navigation
src/
  config/
    firebase.ts             Firebase app + auth + Firestore initialization
  context/
    AuthContext.tsx          Global auth state, sign-in/up/out, Firestore profile
    FamilyModeContext.tsx    Family mode PIN gate
  hooks/
    useGoogleAuth.ts        Cross-platform Google Sign-In hook
  api/
    tmdb.ts                 TMDB API — search, popular, movie details
    streaming.ts            Streaming server configs (VidSrc, AutoEmbed, etc.)
  components/
    MovieCard.tsx           Poster card with rating badge
    SearchBar.tsx           Search input
    auth/
      AuthInput.tsx         Styled text input for auth forms
      SocialButton.tsx      Social sign-in button (Google)
    player/
      ServerSelector.tsx    Bottom-sheet modal for switching streaming servers
      QualitySelector.tsx   Bottom-sheet modal for video quality preference
      SubtitleSelector.tsx  Bottom-sheet modal for subtitle language
  navigation/
    Navigation.tsx          Root navigator (Splash → AuthStack or MainApp tabs)
  screens/
    SplashScreen.tsx        Animated brand intro (3.5 s, then auth routing)
    HomeScreen.tsx          Categorised movie carousels
    SearchScreen.tsx        Real-time movie search
    FavoritesScreen.tsx     Saved favourite movies
    MovieDetailsScreen.tsx  Movie info + Watch Now / Resume button + progress bar
    ContinueWatchingScreen  In-progress movies with play/edit/remove actions
    PlayerScreen.tsx        Full-screen WebView player with overlay controls
    ProfileScreen.tsx       Language toggle + settings
    auth/
      LoginScreen.tsx       Email + Google sign-in
      SignUpScreen.tsx      Email + Google sign-up
      ForgotPasswordScreen  Password reset email
  storage/
    storage.ts              AsyncStorage helpers (favorites, continue watching)
  i18n/
    i18n.ts                 i18next initialisation
    locales/en.json         English strings
    locales/ar.json         Arabic strings
```

## Movie Player system

`PlayerScreen` opens as a full-screen modal from MovieDetailsScreen and ContinueWatchingScreen.

- **5 streaming servers** with automatic fallback
- **Server / Quality / Subtitle selectors** via bottom sheets
- **Progress auto-save** — every 30 s and on exit
- **Resume playback** — progress bar + Resume button in MovieDetailsScreen
- **Black and red cinema UI** — controls fade after 4 s; tap to toggle

## Environment variables (set in Replit Secrets/Env)

| Key | Purpose |
|-----|---------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase web app ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | OAuth 2.0 Web Client ID (Firebase Console → Auth → Google → Web SDK config) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | *(optional)* Android OAuth client — native Google Sign-In production UX |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | *(optional)* iOS OAuth client — native Google Sign-In production UX |
| `EXPO_PUBLIC_OMDB_API_KEY` | OMDb API key (movie search) |

## Achievements & XP System

Added in full — does NOT touch Movie Player, Google Sign-In, Firebase Auth, or storage.ts.

### Architecture
- `src/types/achievements.ts` — TypeScript types (Achievement, UserStats, AchievementId, etc.)
- `src/data/achievements.ts` — 18 achievement definitions + XP helpers (`xpToLevel`, `levelToXP`, `XP_PER_LEVEL=500`)
- `src/context/XPContext.tsx` — `XPProvider` wrapping the app; Firestore-backed; exports `useXP()` / `useXPPublic()`
- `src/components/AchievementUnlockToast.tsx` — animated gold toast overlay (slides from top, auto-dismisses 3.5 s)
- `src/screens/AchievementsScreen.tsx` — full achievements page with progress bars, XP level card, category grouping

### Firestore schema (added to `users/{uid}`)
```
xp: number
moviesWatched / seriesWatched / episodesWatched / commentsCount / animeWatched / animationWatched: number
loginStreak: number
lastLoginDate: 'YYYY-MM-DD'
achievements: { [achievementId]: { unlockedAt: number, xpAwarded: number } }
```

### Trigger points
- `handleWatchNow` in MovieDetailsScreen → `trackContentWatched({ contentType, genres })`
- `handlePostComment` in MovieDetailsScreen → `trackComment()`
- Login streak → checked on `XPContext` mount via `checkLoginStreak`

### Key design decisions
- Achievement unlocks are **atomic via `runTransaction`** — server-side idempotency prevents double XP
- Level achievements (`level_10` … `level_150`) award **0 XP** to prevent infinite level-up loops
- Base XP per action: watch movie +50, watch series +30, episode +20, comment +10
- Level formula: `level = floor(xp / 500) + 1`

## User preferences
- Keep existing architecture and features intact.
- Do not modify Movie Player or Family Mode.
- Black and red cinema UI (`#0a0e27` / `#e50914`).
- TypeScript only, production-ready.
