import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@ismail_cinema_favorites';
const CONTINUE_WATCHING_KEY = '@ismail_cinema_continue_watching';
const LANGUAGE_KEY = '@ismail_cinema_language';

export interface FavoriteMovie {
  imdbID: string;
  title: string;
  poster: string;
  addedAt: number;
}

export interface ContinueWatchingMovie {
  imdbID: string;
  title: string;
  poster: string;
  progress: number;
  watchedAt: number;
}

export const addToFavorites = async (movie: FavoriteMovie): Promise<void> => {
  try {
    const favorites = await getFavorites();
    const exists = favorites.some(m => m.imdbID === movie.imdbID);
    if (!exists) {
      favorites.push(movie);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('Error adding to favorites:', error);
  }
};

export const removeFromFavorites = async (imdbID: string): Promise<void> => {
  try {
    const favorites = await getFavorites();
    const filtered = favorites.filter(m => m.imdbID !== imdbID);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from favorites:', error);
  }
};

export const getFavorites = async (): Promise<FavoriteMovie[]> => {
  try {
    const data = await AsyncStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

export const isFavorite = async (imdbID: string): Promise<boolean> => {
  const favorites = await getFavorites();
  return favorites.some(m => m.imdbID === imdbID);
};

export const addToContinueWatching = async (
  movie: ContinueWatchingMovie
): Promise<void> => {
  try {
    const continuing = await getContinueWatching();
    const index = continuing.findIndex(m => m.imdbID === movie.imdbID);
    if (index >= 0) {
      continuing[index] = movie;
    } else {
      continuing.push(movie);
    }
    await AsyncStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(continuing));
  } catch (error) {
    console.error('Error adding to continue watching:', error);
  }
};

export const getContinueWatching = async (): Promise<ContinueWatchingMovie[]> => {
  try {
    const data = await AsyncStorage.getItem(CONTINUE_WATCHING_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting continue watching:', error);
    return [];
  }
};

export const setLanguage = async (language: 'en' | 'ar'): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error setting language:', error);
  }
};

export const getLanguage = async (): Promise<'en' | 'ar'> => {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_KEY);
    return (language as 'en' | 'ar') || 'en';
  } catch (error) {
    console.error('Error getting language:', error);
    return 'en';
  }
};
