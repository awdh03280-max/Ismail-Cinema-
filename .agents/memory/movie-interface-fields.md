---
name: Movie interface required fields
description: Any function or object literal returning a Movie must include five new detail-only fields added during the MovieDetailsScreen redesign.
---

## Rule

Any function or object literal typed as `Movie` **must** include these five fields or TypeScript will error with `TS2739`:

```typescript
trailerKey: '',          // YouTube key — empty string when not fetched
certification: '',       // Age rating (e.g. "PG-13") — empty string when not fetched
productionCompanies: [], // string[] — empty array when not fetched
imdbExternalId: '',      // TMDB external IMDb ID (e.g. "tt1234567") — empty string when not fetched
tagline: '',             // TMDB tagline — empty string when not fetched
```

**Why:** These fields were added to the `Movie` interface (src/api/tmdb.ts) as part of the MovieDetailsScreen redesign. They are fully populated by `getMovieDetails` and `getTVShowDetails` (which now append `videos,release_dates/content_ratings,external_ids` to the TMDB request), but must be set to safe defaults in any mapping function that doesn't call those detail endpoints (e.g. `toContinueWatchingMovie` in HomeScreen, `mapMovie` base function).

**How to apply:** Whenever writing a function that constructs a `Movie` object from a non-detail source (search results, favorites list, continue-watching store), add the five fields with empty defaults. The `mapMovie` base function in `src/api/tmdb.ts` already does this, so list/search endpoints are covered. Only hand-crafted constructors in screen files need to be checked.

## Firestore comments path

Comments for a title are stored at:
```
movieComments/{contentType}_{movieId}/threads/{commentId}
```

The composite key `{contentType}_{movieId}` (e.g. `movie_550` or `tv_1396`) prevents collisions between movies and TV shows that share the same TMDB numeric ID.
