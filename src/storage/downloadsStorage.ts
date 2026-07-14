/**
 * AsyncStorage persistence for the Downloads feature — follows the same
 * write-lock-per-key pattern as `src/storage/storage.ts`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DownloadRecord } from '../types/downloads';

const writeQueues = new Map<string, Promise<any>>();
function withWriteLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  const next = previous.then(task, task);
  writeQueues.set(key, next.catch(() => undefined));
  return next;
}

const DOWNLOADS_KEY = '@ismail_cinema_downloads';

export const getStoredDownloads = async (): Promise<DownloadRecord[]> => {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error reading downloads:', error);
    return [];
  }
};

export const saveDownloads = async (records: DownloadRecord[]): Promise<void> => {
  return withWriteLock(DOWNLOADS_KEY, async () => {
    try {
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('Error saving downloads:', error);
    }
  });
};
