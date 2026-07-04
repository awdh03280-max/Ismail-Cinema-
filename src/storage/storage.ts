import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@ismail_cinema_favorites';
const CONTINUE_WATCHING_KEY = '@ismail_cinema_continue_watching';
const LANGUAGE_KEY = '@ismail_cinema_language';
const PLAYBACK_KEY = '@ismail_cinema_playback';

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
  progress: number; // 0-100
  watchedAt: number;
}

// ── Favorites ──────────────────────────────────────────────────────────────

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

// ── Continue Watching ──────────────────────────────────────────────────────

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

export const removeContinueWatching = async (imdbID: string): Promise<void> => {
  try {
    const continuing = await getContinueWatching();
    const filtered = continuing.filter(m => m.imdbID !== imdbID);
    await AsyncStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from continue watching:', error);
  }
};

export const updateWatchProgress = async (
  imdbID: string,
  progress: number
): Promise<void> => {
  try {
    const continuing = await getContinueWatching();
    const index = continuing.findIndex(m => m.imdbID === imdbID);
    if (index >= 0) {
      continuing[index].progress = Math.min(Math.max(Math.round(progress), 0), 100);
      continuing[index].watchedAt = Date.now();
      await AsyncStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(continuing));
    }
  } catch (error) {
    console.error('Error updating watch progress:', error);
  }
};

// ── Playback position (precise, 0-100) ────────────────────────────────────

interface PlaybackRecord {
  [imdbID: string]: number;
}

export const savePlaybackPosition = async (
  imdbID: string,
  position: number
): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(PLAYBACK_KEY);
    const record: PlaybackRecord = raw ? JSON.parse(raw) : {};
    record[imdbID] = Math.min(Math.max(position, 0), 100);
    await AsyncStorage.setItem(PLAYBACK_KEY, JSON.stringify(record));
  } catch (error) {
    console.error('Error saving playback position:', error);
  }
};

export const getPlaybackPosition = async (
  imdbID: string
): Promise<number | null> => {
  try {
    const raw = await AsyncStorage.getItem(PLAYBACK_KEY);
    if (!raw) return null;
    const record: PlaybackRecord = JSON.parse(raw);
    return record[imdbID] ?? null;
  } catch (error) {
    console.error('Error getting playback position:', error);
    return null;
  }
};

// ── Family Mode ────────────────────────────────────────────────────────────

const FAMILY_MODE_KEY = '@ismail_cinema_family_mode';

export interface FamilyModeSettings {
  enabled: boolean;
  pin: string | null;
}

export const getFamilyModeSettings = async (): Promise<FamilyModeSettings> => {
  try {
    const data = await AsyncStorage.getItem(FAMILY_MODE_KEY);
    return data ? JSON.parse(data) : { enabled: false, pin: null };
  } catch (error) {
    console.error('Error getting family mode settings:', error);
    return { enabled: false, pin: null };
  }
};

export const setFamilyModeSettings = async (
  settings: FamilyModeSettings
): Promise<void> => {
  try {
    await AsyncStorage.setItem(FAMILY_MODE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error setting family mode settings:', error);
  }
};

// ── Language ───────────────────────────────────────────────────────────────

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
