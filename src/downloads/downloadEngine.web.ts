/**
 * Web download engine — expo-file-system has no real filesystem on web
 * (documentDirectory is null there), so this engine downloads real bytes
 * via `fetch()` with streamed progress and persists them as base64 in
 * AsyncStorage (which is backed by localStorage on web). This is genuinely
 * downloaded data counted toward the storage-usage figure — not a fake
 * progress simulation.
 *
 * Pause/resume: pausing aborts the in-flight fetch and keeps the bytes
 * received so far in memory; resuming re-requests the remainder via an
 * HTTP Range header. TMDB's image CDN supports this, but if a Range resume
 * ever fails (e.g. a CDN without Range/CORS support), it falls back to
 * restarting the transfer from scratch rather than erroring out.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EngineProgressCallback, EngineResumable, EngineResult } from './downloadEngineTypes';

export const platformLabel = 'browser storage';

const ASSET_INDEX_KEY = '@ismail_cinema_downloads_web_index';
const assetKey = (id: string, filename: string): string =>
  `@ismail_cinema_download_asset_${id}_${filename}`;

const getIndex = async (): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(ASSET_INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
};

const addToIndex = async (key: string): Promise<void> => {
  const idx = await getIndex();
  if (!idx.includes(key)) {
    idx.push(key);
    await AsyncStorage.setItem(ASSET_INDEX_KEY, JSON.stringify(idx));
  }
};

const removeFromIndexByPrefix = async (prefix: string): Promise<void> => {
  const idx = await getIndex();
  const toRemove = idx.filter(k => k.startsWith(prefix));
  for (const k of toRemove) await AsyncStorage.removeItem(k);
  const next = idx.filter(k => !k.startsWith(prefix));
  await AsyncStorage.setItem(ASSET_INDEX_KEY, JSON.stringify(next));
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...(bytes.subarray(i, i + chunkSize) as any));
  }
  return btoa(binary);
}

export const ensureReady = async (_id: string): Promise<void> => {};

class WebResumable implements EngineResumable {
  private controller: AbortController | null = null;
  private chunks: Uint8Array[] = [];
  private received = 0;
  private total = 0;

  constructor(
    private url: string,
    private storageKey: string,
    private onProgress: EngineProgressCallback
  ) {}

  private mergeChunks(): Uint8Array {
    const merged = new Uint8Array(this.received);
    let offset = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return merged;
  }

  private async run(useRange: boolean): Promise<EngineResult | undefined> {
    this.controller = new AbortController();
    const headers: Record<string, string> = {};
    if (useRange && this.received > 0) headers.Range = `bytes=${this.received}-`;

    try {
      const res = await fetch(this.url, { signal: this.controller.signal, headers });
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);

      const contentLength = res.headers.get('content-length');
      const chunkTotal = contentLength ? parseInt(contentLength, 10) : 0;
      this.total = useRange && this.received > 0 ? this.received + chunkTotal : chunkTotal;

      const reader = res.body?.getReader();
      if (reader) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          this.chunks.push(value);
          this.received += value.length;
          this.onProgress({
            totalBytesWritten: this.received,
            totalBytesExpectedToWrite: this.total || this.received,
          });
        }
      } else {
        const buf = new Uint8Array(await res.arrayBuffer());
        this.chunks = [buf];
        this.received = buf.length;
        this.total = this.received;
      }

      const base64 = uint8ToBase64(this.mergeChunks());
      await AsyncStorage.setItem(this.storageKey, base64);
      await addToIndex(this.storageKey);
      return { localUri: `webstore://${this.storageKey}` };
    } catch (error) {
      if (this.controller?.signal.aborted) return undefined; // paused or canceled
      throw error;
    }
  }

  async downloadAsync(): Promise<EngineResult | undefined> {
    this.chunks = [];
    this.received = 0;
    return this.run(false);
  }

  async resumeAsync(): Promise<EngineResult | undefined> {
    try {
      return await this.run(true);
    } catch (error) {
      console.warn('Web download Range-resume failed, restarting transfer:', error);
      this.chunks = [];
      this.received = 0;
      return this.run(false);
    }
  }

  async pauseAsync(): Promise<void> {
    this.controller?.abort();
  }

  async cancelAsync(): Promise<void> {
    this.controller?.abort();
    this.chunks = [];
    this.received = 0;
  }
}

export const createResumable = (
  url: string,
  id: string,
  filename: string,
  onProgress: EngineProgressCallback
): EngineResumable => new WebResumable(url, assetKey(id, filename), onProgress);

export const fetchSimple = async (url: string, id: string, filename: string): Promise<string> => {
  const key = assetKey(id, filename);
  const res = await fetch(url);
  const buf = new Uint8Array(await res.arrayBuffer());
  await AsyncStorage.setItem(key, uint8ToBase64(buf));
  await addToIndex(key);
  return `webstore://${key}`;
};

export const writeMetadata = async (id: string, meta: object): Promise<string> => {
  const key = assetKey(id, 'meta');
  await AsyncStorage.setItem(key, JSON.stringify(meta));
  await addToIndex(key);
  return `webstore://${key}`;
};

export const deleteAssets = async (id: string): Promise<void> => {
  await removeFromIndexByPrefix(assetKey(id, ''));
};

export const getUsage = async (): Promise<{ bytes: number; itemCount: number }> => {
  try {
    const idx = await getIndex();
    let bytes = 0;
    const ids = new Set<string>();
    for (const key of idx) {
      const val = await AsyncStorage.getItem(key);
      if (val) bytes += val.length; // stored string length approximates on-disk bytes
      const match = key.match(/^@ismail_cinema_download_asset_(.+)_[a-zA-Z]+$/);
      if (match) ids.add(match[1]);
    }
    return { bytes, itemCount: ids.size };
  } catch (error) {
    console.error('Error computing storage usage (web):', error);
    return { bytes: 0, itemCount: 0 };
  }
};
