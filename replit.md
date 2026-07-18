# Ismail Cinema

A premium Netflix-style React Native Expo movie application with Arabic and English support, powered by TMDB API and Firebase.

## Tech Stack

- **Framework**: React Native + Expo (~50.0.0)
- **Navigation**: React Navigation (bottom tabs + native stack)
- **Backend**: Firebase (Auth + Firestore real-time database)
- **Movie Data**: TMDB API (hardcoded key in `src/api/tmdb.ts`)
- **Streaming**: Multi-server embed (VidSrc, AutoEmbed, etc.) via WebView
- **State**: React Context (Auth, XP, Follow, FamilyMode)
- **i18n**: i18next (English + Arabic)
- **Storage**: AsyncStorage (favorites, continue-watching, playback position)

## Running the App

```bash
npm install --legacy-peer-deps
npm start
```

Workflow: **Start application** → `node_modules/.bin/expo start --web --port 5000`

The web preview opens at port 5000. For mobile, scan the QR code with Expo Go.

## Environment Variables

Required in `.env` (Firebase credentials needed for auth/social features):

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

TMDB API key is hardcoded in `src/api/tmdb.ts` (line 3).

## Project Structure

```
src/
├── api/            # TMDB API + streaming server integration
├── components/     # Reusable UI components
├── config/         # Firebase initialization
├── context/        # Auth, XP/Achievements, Follow/Social, FamilyMode
├── data/           # Static achievement definitions
├── hooks/          # useGoogleAuth
├── i18n/           # Internationalization (en/ar)
├── navigation/     # React Navigation root + stacks
├── screens/        # All screen components
│   ├── auth/       # Login, SignUp, ForgotPassword
│   └── *.tsx       # Home, Search, Player, Profile, etc.
├── storage/        # AsyncStorage helpers (favorites, continue-watching)
├── theme/          # Color palette (Black + Gold + Red)
├── types/          # TypeScript definitions
└── utils/          # PIN hashing
```

## Key Features

- **Streaming**: Multi-server movie/TV player with auto-fallback
- **Auth**: Email/password + Google Sign-In (web: popup/redirect, native: expo-auth-session). Browsing (Home, Search, Continue Watching, movie/TV details, trailers, player) never requires sign-in — the app opens straight to Home after the splash screen. Sign-in only happens from the Profile tab (`ProfileSignInPrompt`) or from an `AuthGate` prompt when opening a protected screen (Favorites, Watch Party, Followers/Following, Notifications). Facebook and Phone Number sign-in are shown as options in the Profile sign-in prompt but are UI-only placeholders — enabling them requires configuring a Facebook App ID / Phone provider in the Firebase console.
- **Social**: Follow/unfollow, public profiles, real-time notifications
- **Watch Party**: Create or join a Firestore-synced watch party via 6-char code
- **Achievements**: 18 achievements with XP/leveling system
- **Family Mode**: PIN-protected adult content filter
- **Comments**: Real-time Firestore comments with likes on movie pages
- **Continue Watching**: Auto-saved playback progress
- **Favorites**: Persisted to AsyncStorage
- **i18n**: English ↔ Arabic toggle

## Firestore Collections

- `users/{uid}` — profile, XP, level, stats, achievements map
- `follows/{followerId}_{followingId}` — social graph
- `notifications/{uid}/feed/{docId}` — activity feed
- `movieComments/{contentType}_{movieId}/threads/{docId}` — comments
- `watchParties/{partyId}` — watch party rooms
- `watchParties/{partyId}/members/{uid}` — party members
- `watchParties/{partyId}/chat/{docId}` — party chat

## Google Play Release

- Package: `com.ismailcinema.app`
- versionCode: 3, version: 1.1.0
- targetSdkVersion: 34, minSdkVersion: 23
- Build with: `eas build --platform android --profile production`

## User Preferences

- Keep the Black + Gold + Red premium design throughout
- Never rebuild the project from scratch
- Google Sign-In must stay working
- Firebase must stay working
- Movie Player (WebView embed) must stay unchanged

## Maintenance Log

- **2026-07-15**: Re-imported project — ran `npm install --legacy-peer-deps` (node_modules was empty) and confirmed the `Start application` workflow boots cleanly on port 5000. Removed confirmed-dead files: duplicate `src/localization/` (i18n dir, superseded by `src/i18n/`) and unused `src/components/HeroBanner.tsx` (never imported; Home's hero section is built inline in `HomeScreen.tsx`). Verified with `tsc --noEmit` after cleanup.
- **2026-07-16**: Re-imported again — node_modules was empty. Ran `npm install --legacy-peer-deps`, restarted `Start application` workflow, confirmed app boots on port 5000 (splash screen visible).
- **2026-07-17**: Implemented 4 improvements: (1) Arabic default language — `i18n.ts` lng:'ar', `getLanguage` default 'ar', `App.tsx` loads saved lang from AsyncStorage before first render; (2) Full translation coverage — added ~40 new keys to en.json/ar.json, translated all auth screens (LoginScreen, SignUpScreen, ForgotPasswordScreen), ProfileScreen (Followers, Following, Level XP, Achievements, Privacy, Watch Parties), Navigation tab/screen titles; (3) Fullscreen landscape player — `expo-screen-orientation@6.4.1` installed, locks LANDSCAPE on mount, restores PORTRAIT_UP on unmount, `presentation: 'fullScreenModal'` + `orientation: 'landscape'` on Player stack screen; (4) Improved player — auto-hide changed from 4s to 3s, double-tap left/right gesture detection (visual seek feedback overlay with `play-back`/`play-forward` icons + "10s"/"١٠ث"), Pressable replaces TouchableOpacity for tap-zone position awareness. TypeScript: 0 errors. Expo Doctor: 16/16 checks passed.
- **2026-07-18**: Four critical fixes + player WebView debug: (1) Android Profile crash — removed shared JSX variable pattern; all `Stack.Screen` elements inlined directly in each `Stack.Navigator`. (2) Video playback / ad redirects — first attempt used `onShouldStartLoadWithRequest` whitelist which broke VidSrc (embed sites redirect through CDN chains not in whitelist → blank white screen). Fixed by removing `onShouldStartLoadWithRequest` entirely; popup ads blocked via injected JS (`window.open=null`, `_blank` rewrite). Added JS content detector: polls for `<video>` every 500ms → posts `VIDEO_OK`; after 8 s with no video/iframe → posts `BLANK_PAGE`. `PlayerScreen` handles these via `onWebMessage` + a 20 s hard-fallback timer (`blankTimeoutRef`) that auto-switches to next server. (3) True fullscreen — `PlayerScreen` in root navigator above `BottomTabNavigator`. (4) TMDB Arabic — `language: 'ar'` axios default. TypeScript: 0 errors. Expo Doctor: 16/16 checks passed. APK: `4ae3704b`.
