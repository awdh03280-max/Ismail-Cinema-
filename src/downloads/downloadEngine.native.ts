/**
 * Native (iOS/Android) download engine — real files on disk via
 * expo-file-system, with real byte-level pause/resume/cancel.
 */
import * as FileSystem from 'expo-file-system';
import { EngineProgressCallback, EngineResumable, EngineResult } from './downloadEngineTypes';

export const platformLabel = 'device storage';

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}downloads/`;
const itemDir = (id: string): string => `${DOWNLOADS_DIR}${id}/`;

export const ensureReady = async (id: string): Promise<void> => {
  const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  const itemInfo = await FileSystem.getInfoAsync(itemDir(id));
  if (!itemInfo.exists) await FileSystem.makeDirectoryAsync(itemDir(id), { intermediates: true });
};

class NativeResumable implements EngineResumable {
  private resumable: FileSystem.DownloadResumable;

  constructor(url: string, path: string, onProgress: EngineProgressCallback) {
    this.resumable = FileSystem.createDownloadResumable(url, path, {}, onProgress);
  }

  async downloadAsync(): Promise<EngineResult | undefined> {
    const r = await this.resumable.downloadAsync();
    return r ? { localUri: r.uri } : undefined;
  }

  async resumeAsync(): Promise<EngineResult | undefined> {
    const r = await this.resumable.resumeAsync();
    return r ? { localUri: r.uri } : undefined;
  }

  async pauseAsync(): Promise<void> {
    await this.resumable.pauseAsync();
  }

  async cancelAsync(): Promise<void> {
    await this.resumable.cancelAsync();
  }
}

export const createResumable = (
  url: string,
  id: string,
  filename: string,
  onProgress: EngineProgressCallback
): EngineResumable => new NativeResumable(url, `${itemDir(id)}${filename}`, onProgress);

export const fetchSimple = async (url: string, id: string, filename: string): Promise<string> => {
  const path = `${itemDir(id)}${filename}`;
  await FileSystem.downloadAsync(url, path);
  return path;
};

export const writeMetadata = async (id: string, meta: object): Promise<string> => {
  const path = `${itemDir(id)}meta.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(meta, null, 2));
  return path;
};

export const deleteAssets = async (id: string): Promise<void> => {
  try {
    const info = await FileSystem.getInfoAsync(itemDir(id));
    if (info.exists) await FileSystem.deleteAsync(itemDir(id), { idempotent: true });
  } catch (error) {
    console.error('Error deleting download files:', error);
  }
};

export const getUsage = async (): Promise<{ bytes: number; itemCount: number }> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
    if (!dirInfo.exists) return { bytes: 0, itemCount: 0 };
    const ids = await FileSystem.readDirectoryAsync(DOWNLOADS_DIR);
    let bytes = 0;
    let itemCount = 0;
    for (const id of ids) {
      const files = await FileSystem.readDirectoryAsync(itemDir(id)).catch(() => []);
      if (files.length > 0) itemCount += 1;
      for (const file of files) {
        const info = await FileSystem.getInfoAsync(`${itemDir(id)}${file}`, { size: true });
        if (info.exists && !info.isDirectory) bytes += (info as any).size ?? 0;
      }
    }
    return { bytes, itemCount };
  } catch (error) {
    console.error('Error computing storage usage:', error);
    return { bytes: 0, itemCount: 0 };
  }
};
