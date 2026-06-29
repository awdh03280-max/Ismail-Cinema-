import axios from 'axios';

const OMDB_API_KEY = 'k_3v6c8x9w';
const OMDB_BASE_URL = 'https://www.omdbapi.com';

const omdbClient = axios.create({
  baseURL: OMDB_BASE_URL,
  params: {
    apikey: OMDB_API_KEY,
  },
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
}

export interface MovieSearchResponse {
  Search: Movie[];
  totalResults: string;
  Response: string;
}

export interface MovieDetailsResponse extends Movie {
  Response: string;
  Error?: string;
}

export const searchMovies = async (
  query: string,
  page: number = 1
): Promise<MovieSearchResponse> => {
  try {
    const response = await omdbClient.get('/', {
      params: {
        s: query,
        type: 'movie',
        page,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error searching movies:', error);
    throw error;
  }
};

export const getMovieDetails = async (imdbID: string): Promise<MovieDetailsResponse> => {
  try {
    const response = await omdbClient.get('/', {
      params: {
        i: imdbID,
        plot: 'full',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    throw error;
  }
};

export const getTrendingMovies = async (): Promise<Movie[]> => {
  const trendingSearches = ['avatar', 'inception', 'interstellar', 'matrix', 'oppenheimer'];
  try {
    const results = await Promise.all(
      trendingSearches.map(search => searchMovies(search))
    );

    const allMovies: Movie[] = [];
    results.forEach(result => {
      if (result.Search) {
        allMovies.push(...result.Search.slice(0, 1));
      }
    });

    return allMovies;
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    throw error;
  }
};
