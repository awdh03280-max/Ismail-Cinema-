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
      append_to_response: 'credits',
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

  return movie;
};

export const getTVShowDetails = async (id: string): Promise<Movie> => {
  const res = await api.get(`/tv/${id}`, {
    params: {
      api_key: API_KEY,
      append_to_response: 'credits',
    },
  });

  const show = mapMovie(res.data, 'tv');

  show.Runtime = res.data.episode_run_time?.[0]
    ? `${res.data.episode_run_time[0]} min`
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

  return show;
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
  'Sci-Fi': 878,
  Drama: 18,
  History: 36,
  Mystery: 9648,
  Thriller: 53,
};

export const GENRE_LIST = [
  'Action', 'Comedy', 'Horror', 'War', 'Romance', 'Crime', 'Adventure',
  'Animation', 'Anime', 'Family', 'Fantasy', 'Sci-Fi', 'Drama', 'History',
  'Mystery', 'Thriller',
];

/** Browse titles by genre chip — special-cased for Anime / Animation. */
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
