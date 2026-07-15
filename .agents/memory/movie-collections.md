---
name: Movie Collections
description: How the Browse Collections section on Home works — data, component, screen, navigation
---

# Movie Collections

## Data source
`src/data/collections.ts` — exports `Collection` interface and `COLLECTIONS` array (9 entries).

Each Collection: `{ id, name, subtitle, icon (emoji), gradient: [string, string], genreIds, contentType, sortBy? }`

## Components / Screens
- **`CollectionsSection`** (`src/components/CollectionsSection.tsx`) — horizontal ScrollView of `CollectionCard` components. Each card is 158×218px with LinearGradient, emoji, name, subtitle, "Explore →" footer. Press-scale animation via Animated.spring.
- **`CollectionScreen`** (`src/screens/CollectionScreen.tsx`) — receives `{ collectionId }` route param, calls `discoverMoviesByGenreIds` or `discoverTVByGenreIds` based on `contentType`, renders 2-column FlatList grid with hero header using collection gradient.

## Navigation
- `CollectionScreen` registered as `"Collection"` in `socialScreens` (shared across all stacks) with `headerShown: false`
- Navigate: `navigation.navigate('Collection', { collectionId: collection.id })`

## HomeScreen integration
- `CollectionsSection` rendered after `ContinueWatchingSection`, before the genre sections
- Handler: `handleCollectionPress` navigates to Collection screen

## ContinueWatching tab removal
- `Tab.Screen name="ContinueWatching"` removed from `BottomTabNavigator`
- `ContinueWatchingStack` and `ContinueWatchingScreen` files still exist but are no longer tab-accessible
- The inline `ContinueWatchingSection` on HomeScreen is the only user-facing entry point

**Why:** Home already has an inline Continue Watching section — a dedicated tab was redundant. Collections needed the freed tab slot (well, we didn't add one, just cleaned up).
