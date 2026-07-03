# Ismail Cinema

A Netflix-style React Native/Expo movie application with Arabic and English support.

## Stack
- React Native + Expo SDK 50 (web + Android + iOS)
- TypeScript
- React Navigation (bottom tabs + native stack)
- TMDB API for movie metadata
- react-native-webview for in-app video streaming
- AsyncStorage for favorites, continue watching, and playback progress
- i18next / react-i18next for EN/AR localization

## How to run

```bash
# Expo web (browser preview on Replit)
npm run web

# Android (requires Expo Go or emulator)
npm run android
```

The configured workflow runs `npx expo start --web --port 5000` and opens the app in the Replit preview pane.

## Project structure

```
App.tsx                     Entry point — loads fonts, i18n, renders Navigation
src/
  api/
    tmdb.ts                 TMDB API — search, popular, movie details
    streaming.ts            Streaming server configs (VidSrc, AutoEmbed, etc.)
  components/
    MovieCard.tsx           Poster card with rating badge
    SearchBar.tsx           Search input
    EmptyState.tsx          Empty list placeholder
    LoadingSpinner.tsx      Full-screen loading indicator
    SectionTitle.tsx        Category section header
    player/
      ServerSelector.tsx    Bottom-sheet modal for switching streaming servers
      QualitySelector.tsx   Bottom-sheet modal for video quality preference
      SubtitleSelector.tsx  Bottom-sheet modal for subtitle language
  navigation/
    Navigation.tsx          Root navigator (Splash → MainApp → tabs + stacks)
  screens/
    SplashScreen.tsx        Animated brand intro
    HomeScreen.tsx          Categorised movie carousels
    SearchScreen.tsx        Real-time movie search
    FavoritesScreen.tsx     Saved favourite movies
    MovieDetailsScreen.tsx  Movie info + Watch Now / Resume button + progress bar
    MovieListScreen.tsx     Full grid for a category
    ContinueWatchingScreen  In-progress movies with play/edit/remove actions
    PlayerScreen.tsx        Full-screen WebView player with overlay controls
    ProfileScreen.tsx       Language toggle + settings
  storage/
    storage.ts              AsyncStorage helpers (favorites, continue watching,
                            playback position)
  i18n/
    i18n.ts                 i18next initialisation
    locales/en.json         English strings
    locales/ar.json         Arabic strings
  types/
    navigation.ts           Navigation param-list types
```

## Movie Player system

`PlayerScreen` opens as a full-screen modal from MovieDetailsScreen and ContinueWatchingScreen.

- **5 streaming servers** (VidSrc, VidSrc 2, AutoEmbed, MultiEmbed, 2Embed) with automatic fallback when a server fails or returns HTTP 4xx/5xx.
- **Server selector** — swipe up from the bottom bar to pick a server manually.
- **Quality selector** — UI preference; quality depends on server availability.
- **Subtitle selector** — passes the selected BCP-47 language code to servers that support URL-based subtitle selection (VidSrc, VidSrc 2).
- **Progress auto-save** — every 30 s and on exit; progress is checkpointed before server switches to prevent regression.
- **Resume playback** — MovieDetailsScreen shows a "Resume" button + progress bar when a saved position exists.
- **Black and red cinema UI** — controls fade after 4 s; tap to toggle.

## Environment

- TMDB API key is hardcoded in `src/api/tmdb.ts` (should be moved to an env var for production).
- No OMDb key is required; the `.env` placeholder can be ignored.

## User preferences
- Keep existing architecture and features intact.
- Do not add authentication or social features.
- Black and red cinema UI (`#000` / `#e50914`).
