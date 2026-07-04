import axios from 'axios';

const API_KEY = 'd23add33a918be4eec47fa9ebe6fb003';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

const api = axios.create({
  baseURL: BASE_URL,
});

export interface Movie {
  imdbID: string;
  Title: string;
  Year: string;
  Poster: string;
  Plot: string;
  imdbRating: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Cast: string;
  Type: string;
  Released: string;
  Language: string;
  /** TMDB adult flag — true for explicitly adult content. */
  adult: boolean;
}

function mapMovie(movie: any): Movie {
  return {
    imdbID: movie.id.toString(),
    Title: movie.title || movie.name || '',
    Year: movie.release_date
      ? movie.release_date.substring(0, 4)
      : '',
    Poster: movie.poster_path
      ? `${IMAGE_URL}${movie.poster_path}`
      : '',
    Plot: movie.overview || '',
    imdbRating: movie.vote_average
      ? movie.vote_average.toFixed(1)
      : '0.0',
    Runtime: '',
    Genre: '',
    Director: '',
    Cast: '',
    Type: 'movie',
    Released: movie.release_date || '',
    Language: movie.original_language || '',
    adult: movie.adult === true,
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

  return res.data.results.map(mapMovie);
};

export const getPopularMovies = async (): Promise<Movie[]> => {
  const res = await api.get('/movie/popular', {
    params: {
      api_key: API_KEY,
    },
  });

  return res.data.results.map(mapMovie);
};

export const getMovieDetails = async (id: string): Promise<Movie> => {
  const res = await api.get(`/movie/${id}`, {
    params: {
      api_key: API_KEY,
      append_to_response: 'credits',
    },
  });

  const movie = mapMovie(res.data);

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
