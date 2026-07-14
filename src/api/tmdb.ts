import axios from 'axios';

const API_KEY = 'd23add33a918be4eec47fa9ebe6fb003';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280';

const api = axios.create({
  baseURL: BASE_URL,
});

/** Content categories exposed as browsable navigation sections. */
export type ContentCategory = 'movies' | 'tv' | 'anime' | 'animation';

export interface Movie {
  imdbID: string;
  Title: string;
  Year: string;
  Poster: string;
  /** Wide backdrop image — used for hero banners. */
  Backdrop: string;
  Plot: string;
  imdbRating: string;
  /** Raw TMDB vote count backing the rating. */
  voteCount: number;
  Runtime: string;
  Genre: string;
  Director: string;
  Cast: string;
  Type: string;
  Released: string;
  Language: string;
  /** Full production country names, comma-separated (e.g. "United States, France"). */
  Country: string;
  /** TMDB adult flag — true for explicitly adult content. */
  adult: boolean;
  /** 'movie' | 'tv' — drives which TMDB endpoint to call for details. */
  contentType: 'movie' | 'tv';
  /** YouTube video key for the official trailer (if available). */
  trailerKey: string;
  /** Age/content certification (e.g. "PG-13", "R", "TV-MA"). */
  certification: string;
  /** Production company names (up to 5). */
  productionCompanies: string[];
  /** IMDb external ID (e.g. "tt1234567") — used to link to IMDb. */
  imdbExternalId: string;
  /** Tagline from TMDB. */
  tagline: string;
  /** Number of seasons (TV shows only). */
  numberOfSeasons?: number;
  /** Season list (TV shows only — populated by getTVShowDetails). */
  seasons?: TVSeasonInfo[];
}

function mapMovie(movie: any, contentType: 'movie' | 'tv' = 'movie'): Movie {
  return {
    imdbID: movie.id.toString(),
    Title: movie.title || movie.name || '',
    Year: (movie.release_date || movie.first_air_date)
      ? (movie.release_date || movie.first_air_date).substring(0, 4)
      : '',
    Poster: movie.poster_path
      ? `${IMAGE_URL}${movie.poster_path}`
      : '',
    Backdrop: movie.backdrop_path
      ? `${BACKDROP_URL}${movie.backdrop_path}`
      : (movie.poster_path ? `${BACKDROP_URL}${movie.poster_path}` : ''),
    Plot: movie.overview || '',
    imdbRating: movie.vote_average
      ? movie.vote_average.toFixed(1)
      : '0.0',
    voteCount: movie.vote_count || 0,
    Runtime: '',
    Genre: '',
    Director: '',
    Cast: '',
    Type: contentType === 'tv' ? 'series' : 'movie',
    Released: movie.release_date || movie.first_air_date || '',
    Language: movie.original_language || '',
    Country: (movie.production_countries || [])
      .map((c: any) => c.name)
      .join(', '),
    adult: movie.adult === true,
    contentType,
    trailerKey: '',
    certification: '',
    productionCompanies: [],
    imdbExternalId: '',
    tagline: movie.tagline || '',
  };
}

export const searchMovies = async (query: string): Promise<Movie[]> => {
  const res = await api.get('/search/movie', {
    params: {
      api_key: API_KEY,
      query,
      include_adult: false,
    },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'movie'));
};

export const getPopularMovies = async (): Promise<Movie[]> => {
  const res = await api.get('/movie/popular', {
    params: {
      api_key: API_KEY,
    },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'movie'));
};

export const getTopRatedMovies = async (): Promise<Movie[]> => {
  const res = await api.get('/movie/top_rated', {
    params: { api_key: API_KEY },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'movie'));
};

export const getUpcomingMovies = async (): Promise<Movie[]> => {
  const res = await api.get('/movie/upcoming', {
    params: { api_key: API_KEY },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'movie'));
};

export const getPopularTVShows = async (): Promise<Movie[]> => {
  const res = await api.get('/tv/popular', {
    params: { api_key: API_KEY },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'tv'));
};

export const getTopRatedTVShows = async (): Promise<Movie[]> => {
  const res = await api.get('/tv/top_rated', {
    params: { api_key: API_KEY },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'tv'));
};

/** Japanese-language animated TV — the closest TMDB approximation to "anime". */
export const getAnime = async (): Promise<Movie[]> => {
  const res = await api.get('/discover/tv', {
    params: {
      api_key: API_KEY,
      with_genres: 16,
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
    },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'tv'));
};

/** Animated movies (family/studio animation) — Animation genre, excluding anime titles. */
export const getAnimationMovies = async (): Promise<Movie[]> => {
  const res = await api.get('/discover/movie', {
    params: {
      api_key: API_KEY,
      with_genres: 16,
      sort_by: 'popularity.desc',
    },
  });

  return res.data.results
    .filter((m: any) => m.original_language !== 'ja')
    .map((m: any) => mapMovie(m, 'movie'));
};

// ── Anime section endpoints ───────────────────────────────────────────────────

/** Alias for the Anime screen's "Popular Anime" row. */
export const getPopularAnime = getAnime;

/** Trending anime — TMDB's global trending TV feed, filtered to Japanese animation. */
export const getTrendingAnime = async (): Promise<Movie[]> => {
  const res = await api.get('/trending/tv/week', {
    params: { api_key: API_KEY },
  });

  return res.data.results
    .filter((m: any) => m.genre_ids?.includes(16) && m.original_language === 'ja')
    .map((m: any) => mapMovie(m, 'tv'));
};

/** Highest-rated anime with a meaningful vote count. */
export const getTopRatedAnime = async (): Promise<Movie[]> => {
  const res = await api.get('/discover/tv', {
    params: {
      api_key: API_KEY,
      with_genres: 16,
      with_original_language: 'ja',
      sort_by: 'vote_average.desc',
      'vote_count.gte': 50,
    },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'tv'));
};

/** Anime currently airing new episodes. */
export const getNewEpisodeAnime = async (): Promise<Movie[]> => {
  const res = await api.get('/discover/tv', {
    params: {
      api_key: API_KEY,
      with_genres: 16,
      with_original_language: 'ja',
      sort_by: 'first_air_date.desc',
      'air_date.lte': new Date().toISOString().slice(0, 10),
      with_status: '0|2',
    },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'tv'));
};

/** Anime-only search — filters TV search results down to Japanese animation. */
export const searchAnime = async (query: string): Promise<Movie[]> => {
  const res = await api.get('/search/tv', {
    params: { api_key: API_KEY, query, include_adult: false },
  });

  return (res.data.results || [])
    .filter((m: any) => m.genre_ids?.includes(16) && m.original_language === 'ja')
    .map((m: any) => mapMovie(m, 'tv'));
};

// ── Animation section endpoints ───────────────────────────────────────────────

/** Alias for the Animation screen's "Animated Movies" row. */
export const getAnimatedMovies = getAnimationMovies;

/** Animated series — Animation genre TV shows, excluding Japanese anime. */
export const getAnimatedSeries = async (): Promise<Movie[]> => {
  const res = await api.get('/discover/tv', {
    params: {
      api_key: API_KEY,
      with_genres: 16,
      sort_by: 'popularity.desc',
    },
  });

  return res.data.results
    .filter((m: any) => m.original_language !== 'ja')
    .map((m: any) => mapMovie(m, 'tv'));
};

/** Family-friendly animated movies — Animation + Family genres combined. */
export const getFamilyAnimation = async (): Promise<Movie[]> => {
  const res = await api.get('/discover/movie', {
    params: {
      api_key: API_KEY,
      with_genres: '16,10751',
      sort_by: 'popularity.desc',
    },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'movie'));
};

/** Kids Collection — well-known, highly-voted animated titles suited for kids. */
export const getKidsCollection = async (): Promise<Movie[]> => {
  const res = await api.get('/discover/movie', {
    params: {
      api_key: API_KEY,
      with_genres: '16,10751',
      sort_by: 'vote_count.desc',
      'vote_average.gte': 6,
    },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'movie'));
};

/** Disney / Pixar style collections — filtered by known studio company IDs. */
export const getDisneyPixarCollection = async (): Promise<Movie[]> => {
  const res = await api.get('/discover/movie', {
    params: {
      api_key: API_KEY,
      with_companies: '2|3|6125|6127',
      sort_by: 'popularity.desc',
    },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'movie'));
};

/** Animation-only search — merges movie + TV search results filtered to Animation genre. */
export const searchAnimation = async (query: string): Promise<Movie[]> => {
  const [movieRes, tvRes] = await Promise.all([
    api.get('/search/movie', { params: { api_key: API_KEY, query, include_adult: false } }),
    api.get('/search/tv', { params: { api_key: API_KEY, query, include_adult: false } }),
  ]);

  const movies = (movieRes.data.results || [])
    .filter((m: any) => m.genre_ids?.includes(16) && m.original_language !== 'ja')
    .map((m: any) => mapMovie(m, 'movie'));

  const shows = (tvRes.data.results || [])
    .filter((m: any) => m.genre_ids?.includes(16) && m.original_language !== 'ja')
    .map((m: any) => mapMovie(m, 'tv'));

  return [...movies, ...shows];
};

export const getMovieDetails = async (id: string): Promise<Movie> => {
  const res = await api.get(`/movie/${id}`, {
    params: {
      api_key: API_KEY,
      append_to_response: 'credits,videos,release_dates,external_ids',
    },
  });

  const movie = mapMovie(res.data, 'movie');

  movie.Runtime = res.data.runtime
    ? `${res.data.runtime} min`
    : '';

  movie.Genre = res.data.genres
    ?.map((g: any) => g.name)
    .join(', ');

  movie.Director =
    res.data.credits?.crew
      ?.find((c: any) => c.job === 'Director')
      ?.name || '';

  movie.Cast =
    res.data.credits?.cast
      ?.slice(0, 5)
      ?.map((c: any) => c.name)
      .join(', ') || '';

  movie.tagline = res.data.tagline || '';

  // Official trailer from YouTube
  const trailer = (res.data.videos?.results || []).find(
    (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
  ) || (res.data.videos?.results || []).find(
    (v: any) => v.site === 'YouTube'
  );
  movie.trailerKey = trailer?.key || '';

  // US age certification
  const usRelease = (res.data.release_dates?.results || []).find(
    (r: any) => r.iso_3166_1 === 'US'
  );
  const certEntry = (usRelease?.release_dates || []).find(
    (d: any) => d.certification
  );
  movie.certification = certEntry?.certification || '';

  // Production companies (up to 5)
  movie.productionCompanies = (res.data.production_companies || [])
    .slice(0, 5)
    .map((c: any) => c.name as string);

  // IMDb external ID
  movie.imdbExternalId = res.data.external_ids?.imdb_id || '';

  return movie;
};

export const getTVShowDetails = async (id: string): Promise<Movie> => {
  const res = await api.get(`/tv/${id}`, {
    params: {
      api_key: API_KEY,
      append_to_response: 'credits,videos,content_ratings,external_ids',
    },
  });

  const show = mapMovie(res.data, 'tv');

  show.Runtime = res.data.episode_run_time?.[0]
    ? `${res.data.episode_run_time[0]} min/ep`
    : '';

  show.Genre = res.data.genres
    ?.map((g: any) => g.name)
    .join(', ');

  show.Director =
    res.data.credits?.crew
      ?.find((c: any) => c.job === 'Director')
      ?.name ||
    res.data.created_by?.[0]?.name ||
    '';

  show.Cast =
    res.data.credits?.cast
      ?.slice(0, 5)
      ?.map((c: any) => c.name)
      .join(', ') || '';

  show.tagline = res.data.tagline || '';

  // Official trailer from YouTube
  const trailer = (res.data.videos?.results || []).find(
    (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
  ) || (res.data.videos?.results || []).find(
    (v: any) => v.site === 'YouTube'
  );
  show.trailerKey = trailer?.key || '';

  // US content rating
  const usRating = (res.data.content_ratings?.results || []).find(
    (r: any) => r.iso_3166_1 === 'US'
  );
  show.certification = usRating?.rating || '';

  // Production companies (up to 5)
  show.productionCompanies = (res.data.production_companies || [])
    .slice(0, 5)
    .map((c: any) => c.name as string);

  // IMDb external ID
  show.imdbExternalId = res.data.external_ids?.imdb_id || '';

  // Seasons list
  show.numberOfSeasons = res.data.number_of_seasons || 0;
  show.seasons = (res.data.seasons || [])
    .filter((s: any) => s.season_number > 0)
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      season_number: s.season_number,
      episode_count: s.episode_count,
      poster_path: s.poster_path ? `${IMAGE_URL}${s.poster_path}` : null,
      air_date: s.air_date || '',
    }));

  return show;
};

/** Episode details for a single season. */
export interface TVEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string;
  runtime: number | null;
  still_path: string | null;
  vote_average: number;
}

export interface TVSeasonInfo {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  air_date: string;
}

export interface TVSeasonDetails {
  id: number;
  name: string;
  season_number: number;
  episodes: TVEpisode[];
  poster_path: string | null;
  air_date: string;
}

/** Fetch all episodes for a specific season of a TV show. */
export const getTVSeasonDetails = async (
  showId: string,
  seasonNumber: number
): Promise<TVSeasonDetails> => {
  const res = await api.get(`/tv/${showId}/season/${seasonNumber}`, {
    params: { api_key: API_KEY },
  });

  return {
    id: res.data.id,
    name: res.data.name || `Season ${seasonNumber}`,
    season_number: res.data.season_number,
    episodes: (res.data.episodes || []).map((ep: any) => ({
      id: ep.id,
      episode_number: ep.episode_number,
      season_number: ep.season_number,
      name: ep.name || `Episode ${ep.episode_number}`,
      overview: ep.overview || '',
      air_date: ep.air_date || '',
      runtime: ep.runtime ?? null,
      still_path: ep.still_path
        ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
        : null,
      vote_average: ep.vote_average || 0,
    })),
    poster_path: res.data.poster_path
      ? `${IMAGE_URL}${res.data.poster_path}`
      : null,
    air_date: res.data.air_date || '',
  };
};

/** Fetch details for either a movie or a TV/anime item based on contentType. */
export const getDetails = async (
  id: string,
  contentType: 'movie' | 'tv' = 'movie'
): Promise<Movie> => {
  return contentType === 'tv' ? getTVShowDetails(id) : getMovieDetails(id);
};

/** Similar titles based on shared genres/keywords. */
export const getSimilarTitles = async (
  id: string,
  contentType: 'movie' | 'tv' = 'movie'
): Promise<Movie[]> => {
  const res = await api.get(`/${contentType}/${id}/similar`, {
    params: { api_key: API_KEY },
  });

  return (res.data.results || []).map((m: any) => mapMovie(m, contentType));
};

/** Recommended titles based on TMDB's recommendation engine. */
export const getRecommendedTitles = async (
  id: string,
  contentType: 'movie' | 'tv' = 'movie'
): Promise<Movie[]> => {
  const res = await api.get(`/${contentType}/${id}/recommendations`, {
    params: { api_key: API_KEY },
  });

  return (res.data.results || []).map((m: any) => mapMovie(m, contentType));
};

/** Cast/crew member returned by TMDB credits endpoints. */
export interface CastMember {
  id: number;
  name: string;
  character?: string;
  job?: string;
  profilePath: string | null;
}

export interface CreditsResult {
  cast: CastMember[];
  /** Full crew list, unfiltered. */
  crew: CastMember[];
  director: string;
  writers: string[];
  producers: string[];
}

const WRITER_JOBS = ['Writer', 'Screenplay', 'Story', 'Author'];
const PRODUCER_JOBS = ['Producer', 'Executive Producer'];

export const getCredits = async (
  id: string,
  contentType: 'movie' | 'tv' = 'movie'
): Promise<CreditsResult> => {
  const res = await api.get(`/${contentType}/${id}/credits`, {
    params: { api_key: API_KEY },
  });

  const cast: CastMember[] = (res.data.cast || [])
    .slice(0, 20)
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path ? `${IMAGE_URL}${c.profile_path}` : null,
    }));

  const rawCrew: any[] = res.data.crew || [];

  const crew: CastMember[] = rawCrew.map((c: any) => ({
    id: c.id,
    name: c.name,
    job: c.job,
    profilePath: c.profile_path ? `${IMAGE_URL}${c.profile_path}` : null,
  }));

  const director =
    rawCrew.find((c: any) => c.job === 'Director')?.name || '';

  const writers = Array.from(
    new Set(
      rawCrew
        .filter((c: any) => WRITER_JOBS.includes(c.job))
        .map((c: any) => c.name)
    )
  );

  const producers = Array.from(
    new Set(
      rawCrew
        .filter((c: any) => PRODUCER_JOBS.includes(c.job))
        .map((c: any) => c.name)
    )
  );

  return { cast, crew, director, writers, producers };
};

// ── Home screen section endpoints ─────────────────────────────────────────────

/** Trending across movies + TV this week — powers the "Trending Now" row. */
export const getTrendingNow = async (): Promise<Movie[]> => {
  const res = await api.get('/trending/all/week', {
    params: { api_key: API_KEY },
  });

  return (res.data.results || [])
    .filter((m: any) => m.media_type === 'movie' || m.media_type === 'tv')
    .map((m: any) => mapMovie(m, m.media_type === 'tv' ? 'tv' : 'movie'));
};

/** Alias — "Must Watch Movies" row. */
export const getMustWatchMovies = getPopularMovies;

/** Alias — "Must Watch Series" row. */
export const getMustWatchSeries = getPopularTVShows;

/** Highest-rated non-Japanese animation — "Best Animation" row. */
export const getTopRatedAnimation = async (): Promise<Movie[]> => {
  const res = await api.get('/discover/movie', {
    params: {
      api_key: API_KEY,
      with_genres: 16,
      sort_by: 'vote_average.desc',
      'vote_count.gte': 100,
    },
  });

  return res.data.results
    .filter((m: any) => m.original_language !== 'ja')
    .map((m: any) => mapMovie(m, 'movie'));
};

/**
 * Movie of the Day — deterministic pick based on UTC day index.
 * Rotates through a curated pool of popular, highly-rated movies with backdrops.
 * Full details (including trailerKey) are fetched for the winner.
 */
export const getMovieOfTheDay = async (): Promise<Movie> => {
  const res = await api.get('/discover/movie', {
    params: {
      api_key: API_KEY,
      sort_by: 'popularity.desc',
      'vote_average.gte': 7.0,
      'vote_count.gte': 3000,
      page: 1,
    },
  });

  const candidates = (res.data.results || []).filter(
    (m: any) => m.backdrop_path,
  );

  if (!candidates.length) {
    // Fallback: trending #1
    const fallbackRes = await api.get('/trending/movie/week', {
      params: { api_key: API_KEY },
    });
    const fallback = fallbackRes.data.results?.[0];
    if (!fallback) throw new Error('No movie of the day candidates found');
    return getMovieDetails(fallback.id.toString());
  }

  // Rotate once per UTC day — same movie for every user on the same day.
  const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const picked = candidates[dayIndex % candidates.length];

  return getMovieDetails(picked.id.toString());
};

/**
 * Discover movies by raw TMDB genre ID list — used by the Mufakir AI assistant.
 * Results are popularity-sorted and limited to the first page (≈20 titles).
 */
export const discoverMoviesByGenreIds = async (
  genreIds: number[],
  sortBy = 'popularity.desc',
): Promise<Movie[]> => {
  const res = await api.get('/discover/movie', {
    params: {
      api_key: API_KEY,
      with_genres: genreIds.join(','),
      sort_by: sortBy,
      include_adult: false,
    },
  });
  return (res.data.results || []).map((m: any) => mapMovie(m, 'movie'));
};

/**
 * Discover TV shows by raw TMDB genre ID list — used by the Mufakir AI assistant.
 */
export const discoverTVByGenreIds = async (
  genreIds: number[],
  sortBy = 'popularity.desc',
): Promise<Movie[]> => {
  const res = await api.get('/discover/tv', {
    params: {
      api_key: API_KEY,
      with_genres: genreIds.join(','),
      sort_by: sortBy,
      include_adult: false,
    },
  });
  return (res.data.results || []).map((m: any) => mapMovie(m, 'tv'));
};

/** Newly released movies — "Recently Added" row. */
export const getRecentlyAdded = async (): Promise<Movie[]> => {
  const res = await api.get('/movie/now_playing', {
    params: { api_key: API_KEY },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'movie'));
};

// ── Search screen: genre filter chips ─────────────────────────────────────────

/** TMDB movie genre IDs for the Search screen's filter chips (Anime/Animation are special-cased). */
export const GENRE_IDS: Record<string, number> = {
  Action: 28,
  Comedy: 35,
  Horror: 27,
  War: 10752,
  Romance: 10749,
  Crime: 80,
  Adventure: 12,
  Family: 10751,
  Fantasy: 14,
  'Science Fiction': 878,
  Drama: 18,
  History: 36,
  Mystery: 9648,
  Thriller: 53,
};

export const GENRE_LIST = [
  'Action', 'Adventure', 'Horror', 'Comedy', 'Drama', 'Romance', 'Thriller',
  'Mystery', 'Crime', 'Science Fiction', 'Fantasy', 'Family', 'Animation',
  'History', 'War', 'Anime',
];

/** Sort options exposed as chips on the Search screen. */
export type SortKey = 'trending' | 'popular' | 'toprated' | 'new';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'trending', label: 'Trending' },
  { key: 'popular', label: 'Popular' },
  { key: 'toprated', label: 'Top Rated' },
  { key: 'new', label: 'New Releases' },
];

/** Browse titles by a single genre chip — special-cased for Anime / Animation. Kept for backwards compatibility. */
export const discoverByGenre = async (genre: string): Promise<Movie[]> => {
  if (genre === 'Anime') return getAnime();
  if (genre === 'Animation') return getAnimationMovies();

  const genreId = GENRE_IDS[genre];
  if (!genreId) return [];

  const res = await api.get('/discover/movie', {
    params: {
      api_key: API_KEY,
      with_genres: genreId,
      sort_by: 'popularity.desc',
    },
  });

  return res.data.results.map((m: any) => mapMovie(m, 'movie'));
};

/**
 * Browse titles matching ANY of the selected genre chips (OR semantics), across
 * movies + TV. Anime / Animation are special-cased (language/genre combos that
 * don't map to a single TMDB genre id) and merged in alongside the rest.
 */
export const discoverByGenres = async (genres: string[]): Promise<Movie[]> => {
  if (genres.length === 0) return [];

  const specials = genres.filter(g => g === 'Anime' || g === 'Animation');
  const normal = genres.filter(g => GENRE_IDS[g] !== undefined);

  const requests: Promise<Movie[]>[] = [];

  if (normal.length > 0) {
    const withGenres = normal.map(g => GENRE_IDS[g]).join('|');
    requests.push(
      api
        .get('/discover/movie', {
          params: { api_key: API_KEY, with_genres: withGenres, sort_by: 'popularity.desc' },
        })
        .then(res => res.data.results.map((m: any) => mapMovie(m, 'movie')))
    );
    requests.push(
      api
        .get('/discover/tv', {
          params: { api_key: API_KEY, with_genres: withGenres, sort_by: 'popularity.desc' },
        })
        .then(res => res.data.results.map((m: any) => mapMovie(m, 'tv')))
    );
  }

  if (specials.includes('Anime')) requests.push(getAnime());
  if (specials.includes('Animation')) requests.push(getAnimationMovies());

  const results = await Promise.all(requests);
  const merged = results.flat();

  // De-dupe titles that matched more than one request (e.g. movie + tv overlap on id collisions never
  // happen across types since ids are namespaced by contentType in the key already, but genre requests can
  // still repeat the same title across normal/special buckets).
  const seen = new Set<string>();
  return merged.filter(m => {
    const key = `${m.contentType}-${m.imdbID}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Client-side sort applied to whatever result set is currently on screen (text
 * search, genre browse, or the default trending feed) so sorting always works
 * regardless of which TMDB endpoint produced the list.
 */
export const sortMovies = (movies: Movie[], sort: SortKey): Movie[] => {
  const list = [...movies];

  switch (sort) {
    case 'toprated':
      return list.sort((a, b) => {
        const diff = parseFloat(b.imdbRating) - parseFloat(a.imdbRating);
        return diff !== 0 ? diff : b.voteCount - a.voteCount;
      });
    case 'new':
      return list.sort((a, b) => {
        const dateA = a.Released ? new Date(a.Released).getTime() : 0;
        const dateB = b.Released ? new Date(b.Released).getTime() : 0;
        return dateB - dateA;
      });
    case 'trending': {
      // Proxy for "trending": recency-weighted popularity — favors titles that
      // are both well-watched (vote count) and recently released.
      const now = Date.now();
      const score = (m: Movie) => {
        const released = m.Released ? new Date(m.Released).getTime() : 0;
        const ageDays = released ? Math.max(1, (now - released) / (1000 * 60 * 60 * 24)) : 3650;
        return m.voteCount / Math.sqrt(ageDays);
      };
      return list.sort((a, b) => score(b) - score(a));
    }
    case 'popular':
    default:
      return list.sort((a, b) => b.voteCount - a.voteCount);
  }
};

/** Default browse feed shown when no text query or genre filter is active. */
export const getDefaultBrowseFeed = async (): Promise<Movie[]> => {
  return getTrendingNow();
};

/** Generic TV search — used alongside searchMovies for global text search. */
export const searchTVShows = async (query: string): Promise<Movie[]> => {
  const res = await api.get('/search/tv', {
    params: { api_key: API_KEY, query, include_adult: false },
  });

  return (res.data.results || []).map((m: any) => mapMovie(m, 'tv'));
};

/** Combined movie + TV text search for the Search screen. */
export const searchAll = async (query: string): Promise<Movie[]> => {
  const [movies, shows] = await Promise.all([
    searchMovies(query),
    searchTVShows(query),
  ]);
  return [...movies, ...shows];
};

// ── Person / Actor API ────────────────────────────────────────────────────────

/** Full profile returned by /person/{id} */
export interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  popularity: number;
  profile_path: string | null;
  known_for_department: string;
  also_known_as: string[];
  gender: number; // 0=unspecified, 1=female, 2=male, 3=non-binary
}

/** One entry from /person/{id}/combined_credits */
export interface PersonCredit {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  character: string;
  job: string | null;
  media_type: 'movie' | 'tv';
  overview: string;
}

export interface PersonCombinedCredits {
  cast: PersonCredit[];
  crew: PersonCredit[];
}

const PROFILE_URL_LG = 'https://image.tmdb.org/t/p/h632';
const PROFILE_URL_SM = 'https://image.tmdb.org/t/p/w185';

/** Full biography, stats, and metadata for a person. */
export const getPersonDetails = async (personId: number): Promise<PersonDetails> => {
  const res = await api.get(`/person/${personId}`, {
    params: { api_key: API_KEY },
  });
  const d = res.data;
  return {
    id: d.id,
    name: d.name || '',
    biography: d.biography || '',
    birthday: d.birthday || null,
    deathday: d.deathday || null,
    place_of_birth: d.place_of_birth || null,
    popularity: d.popularity || 0,
    profile_path: d.profile_path ? `${PROFILE_URL_LG}${d.profile_path}` : null,
    known_for_department: d.known_for_department || 'Acting',
    also_known_as: d.also_known_as || [],
    gender: d.gender ?? 0,
  };
};

/** All movie + TV credits for a person, deduplicated by id+type. */
export const getPersonCombinedCredits = async (
  personId: number,
): Promise<PersonCombinedCredits> => {
  const res = await api.get(`/person/${personId}/combined_credits`, {
    params: { api_key: API_KEY },
  });

  const mapCredit = (c: any, type: 'movie' | 'tv'): PersonCredit => ({
    id: c.id,
    title: c.title || c.name || '',
    poster_path: c.poster_path ? `${IMAGE_URL}${c.poster_path}` : null,
    backdrop_path: c.backdrop_path ? `${BACKDROP_URL}${c.backdrop_path}` : null,
    release_date: c.release_date || c.first_air_date || '',
    vote_average: c.vote_average || 0,
    vote_count: c.vote_count || 0,
    character: c.character || '',
    job: c.job || null,
    media_type: type,
    overview: c.overview || '',
  });

  // Deduplicate by id+type, keep highest vote_count entry
  const dedupe = (list: PersonCredit[]): PersonCredit[] => {
    const map = new Map<string, PersonCredit>();
    for (const c of list) {
      const key = `${c.media_type}-${c.id}`;
      const existing = map.get(key);
      if (!existing || c.vote_count > existing.vote_count) map.set(key, c);
    }
    return Array.from(map.values());
  };

  const rawCast: any[] = res.data.cast || [];
  const rawCrew: any[] = res.data.crew || [];

  const cast = dedupe(
    rawCast
      .filter((c: any) => c.media_type === 'movie' || c.media_type === 'tv')
      .map((c: any) => mapCredit(c, c.media_type))
      .sort((a, b) => b.vote_count - a.vote_count),
  );

  const crew = dedupe(
    rawCrew
      .filter((c: any) => c.media_type === 'movie' || c.media_type === 'tv')
      .map((c: any) => mapCredit(c, c.media_type))
      .sort((a, b) => b.vote_count - a.vote_count),
  );

  return { cast, crew };
};

/** Small profile image URL (for cast cards etc.) */
export const getSmallProfileUrl = (path: string | null): string | null =>
  path ? `${PROFILE_URL_SM}${path.replace(/^https:\/\/[^/]+\/[^/]+\//, '/')}` : null;

/** Content feed for a given navigation category — hero + carousels. */
export interface CategoryFeed {
  hero: Movie[];
  sections: { title: string; movies: Movie[] }[];
}

export const getCategoryFeed = async (
  category: ContentCategory
): Promise<CategoryFeed> => {
  switch (category) {
    case 'tv': {
      const [popular, topRated] = await Promise.all([
        getPopularTVShows(),
        getTopRatedTVShows(),
      ]);
      return {
        hero: popular.slice(0, 5),
        sections: [
          { title: 'Popular TV Shows', movies: popular },
          { title: 'Top Rated TV Shows', movies: topRated },
        ],
      };
    }
    case 'anime': {
      const anime = await getAnime();
      return {
        hero: anime.slice(0, 5),
        sections: [{ title: 'Trending Anime', movies: anime }],
      };
    }
    case 'animation': {
      const animation = await getAnimationMovies();
      return {
        hero: animation.slice(0, 5),
        sections: [{ title: 'Animated Movies', movies: animation }],
      };
    }
    case 'movies':
    default: {
      const [popular, topRated, upcoming] = await Promise.all([
        getPopularMovies(),
        getTopRatedMovies(),
        getUpcomingMovies(),
      ]);
      return {
        hero: popular.slice(0, 5),
        sections: [
          { title: 'Popular Movies', movies: popular },
          { title: 'Top Rated', movies: topRated },
          { title: 'Coming Soon', movies: upcoming },
        ],
      };
    }
  }
};
