/**
 * DownloadContext — global download queue for the Downloads feature.
 *
 * Manages a list of `DownloadRecord`s persisted to AsyncStorage, plus a
 * single active `EngineResumable` per in-flight download. The heavy lifting
 * (real files on native, fetch+AsyncStorage on web) lives behind the
 * `downloadEngine` module — see `downloadEngine.native.ts` / `.web.ts` and
 * `src/types/downloads.ts` for the offline-info-package architecture note.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { Movie } from '../api/tmdb';
import { DownloadRecord } from '../types/downloads';
import { getStoredDownloads, saveDownloads } from '../storage/downloadsStorage';
import {
  buildInitialRecord,
  buildMetadata,
  primaryAssetUrl,
  posterAssetUrl,
} from '../downloads/downloadManager';
import * as nativeEngine from '../downloads/downloadEngine.native';
import * as webEngine from '../downloads/downloadEngine.web';
import { EngineProgress, EngineResumable } from '../downloads/downloadEngineTypes';

// Metro would auto-pick .native/.web by filename convention, but a plain
// `tsc` pass (used for CI/type-checking here) can't resolve extension-less
// platform imports — so branch explicitly on Platform.OS instead.
const engine = Platform.OS === 'web' ? webEngine : nativeEngine;

interface DownloadContextType {
  downloads: DownloadRecord[];
  storageBytes: number;
  isDownloaded: (id: string) => boolean;
  getDownload: (id: string) => DownloadRecord | undefined;
  startDownload: (movie: Movie) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;
  deleteDownload: (id: string) => Promise<void>;
  retryDownload: (id: string) => Promise<void>;
  refreshStorage: () => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

// Tracks the intent behind an interrupted transfer so a resolved-undefined
// (or, on failure, rejected) resumable can be classified as "paused" /
// "canceled" instead of falling through to "failed".
type Intent = 'pause' | 'cancel' | null;

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [storageBytes, setStorageBytes] = useState(0);
  const resumables = useRef(new Map<string, EngineResumable>());
  const intents = useRef(new Map<string, Intent>());
  const speedTrackers = useRef(new Map<string, { t: number; bytes: number }>());

  const refreshStorage = useCallback(async () => {
    const usage = await engine.getUsage();
    setStorageBytes(usage.bytes);
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await getStoredDownloads();
      // Anything that was mid-transfer when the app last closed resumes as
      // "paused" — there's no live resumable to reattach to across restarts.
      const reconciled = stored.map(d =>
        d.status === 'downloading' || d.status === 'queued'
          ? { ...d, status: 'paused' as const }
          : d
      );
      setDownloads(reconciled);
      await saveDownloads(reconciled);
      refreshStorage();
    })();
  }, [refreshStorage]);

  const updateRecord = useCallback((id: string, patch: Partial<DownloadRecord>) => {
    setDownloads(prev => {
      const next = prev.map(d => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d));
      saveDownloads(next);
      return next;
    });
  }, []);

  const runTransfer = useCallback(
    async (record: DownloadRecord, resumable: EngineResumable, isResume: boolean) => {
      resumables.current.set(record.id, resumable);
      intents.current.set(record.id, null);
      speedTrackers.current.set(record.id, { t: Date.now(), bytes: record.bytesWritten });

      try {
        const result = isResume ? await resumable.resumeAsync() : await resumable.downloadAsync();
        const intent = intents.current.get(record.id);

        if (!result) {
          // Resolves to undefined on pause or cancel — the intent map (set
          // by pauseDownload/cancelDownload) tells us which.
          if (intent === 'cancel') {
            resumables.current.delete(record.id);
            return;
          }
          if (intent === 'pause') {
            // Keep the resumable alive in the map so resumeDownload() can
            // continue the same transfer instead of restarting it.
            updateRecord(record.id, { status: 'paused', speedBps: 0 });
            return;
          }
          resumables.current.delete(record.id);
          updateRecord(record.id, {
            status: 'failed',
            speedBps: 0,
            errorMessage: 'Download stopped unexpectedly — tap retry to try again.',
          });
          return;
        }

        resumables.current.delete(record.id);

        // Primary asset done — quickly grab the poster + write metadata to
        // finish the offline package, then mark complete.
        updateRecord(record.id, { progress: 0.95, bytesWritten: record.bytesTotal, speedBps: 0 });

        let localPosterPath: string | undefined;
        try {
          localPosterPath = await engine.fetchSimple(posterAssetUrl(record), record.id, 'poster.jpg');
        } catch (error) {
          console.warn('Poster fetch failed, continuing without it:', error);
        }
        const localMetaPath = await engine.writeMetadata(record.id, buildMetadata(record));

        updateRecord(record.id, {
          status: 'completed',
          progress: 1,
          localBackdropPath: result.localUri,
          localPosterPath,
          localMetaPath,
          completedAt: Date.now(),
        });
        refreshStorage();
      } catch (error) {
        resumables.current.delete(record.id);
        const intent = intents.current.get(record.id);
        if (intent === 'cancel') {
          // cancelDownload() already updated/removed the record.
        } else if (intent === 'pause') {
          updateRecord(record.id, { status: 'paused', speedBps: 0 });
        } else {
          console.error('Download failed:', error);
          updateRecord(record.id, {
            status: 'failed',
            speedBps: 0,
            errorMessage: 'Network error — tap retry to try again.',
          });
        }
      } finally {
        intents.current.delete(record.id);
      }
    },
    [updateRecord, refreshStorage]
  );

  const beginTransfer = useCallback(
    (record: DownloadRecord) => {
      const onProgress = (dp: EngineProgress) => {
        const tracker = speedTrackers.current.get(record.id) ?? { t: Date.now(), bytes: 0 };
        const now = Date.now();
        const dt = (now - tracker.t) / 1000;
        const dBytes = dp.totalBytesWritten - tracker.bytes;
        const speedBps = dt > 0.15 ? Math.max(0, dBytes / dt) : undefined;
        if (speedBps !== undefined) {
          speedTrackers.current.set(record.id, { t: now, bytes: dp.totalBytesWritten });
        }

        const total = dp.totalBytesExpectedToWrite || record.bytesTotal || 1;
        const progress = Math.min(0.95, (dp.totalBytesWritten / total) * 0.95);
        updateRecord(record.id, {
          status: 'downloading',
          progress,
          bytesWritten: dp.totalBytesWritten,
          bytesTotal: total,
          ...(speedBps !== undefined ? { speedBps } : {}),
        });
      };

      const resumable = engine.createResumable(primaryAssetUrl(record), record.id, 'primary.jpg', onProgress);
      runTransfer(record, resumable, false);
    },
    [runTransfer, updateRecord]
  );

  const startDownload = useCallback(
    async (movie: Movie) => {
      if (
        downloads.some(
          d => d.id === movie.imdbID && d.status !== 'failed' && d.status !== 'canceled'
        )
      ) {
        return;
      }
      const record = buildInitialRecord(movie);
      await engine.ensureReady(record.id);
      setDownloads(prev => {
        const next = [record, ...prev.filter(d => d.id !== movie.imdbID)];
        saveDownloads(next);
        return next;
      });
      beginTransfer(record);
    },
    [downloads, beginTransfer]
  );

  const pauseDownload = useCallback(async (id: string) => {
    const resumable = resumables.current.get(id);
    if (!resumable) return;
    intents.current.set(id, 'pause');
    try {
      await resumable.pauseAsync();
    } catch (error) {
      console.warn('pauseAsync error (ignored):', error);
    }
  }, []);

  const resumeDownload = useCallback(
    async (id: string) => {
      const record = downloads.find(d => d.id === id);
      if (!record) return;
      updateRecord(id, { status: 'downloading' });

      const existing = resumables.current.get(id);
      if (existing) {
        runTransfer(record, existing, true);
      } else {
        // Resumable lost (e.g. app restarted) — restart the transfer fresh.
        beginTransfer(record);
      }
    },
    [downloads, runTransfer, beginTransfer, updateRecord]
  );

  const cancelDownload = useCallback(
    async (id: string) => {
      const resumable = resumables.current.get(id);
      intents.current.set(id, 'cancel');
      if (resumable) {
        try {
          await resumable.cancelAsync();
        } catch (error) {
          console.warn('cancel error (ignored):', error);
        }
        resumables.current.delete(id);
      }
      await engine.deleteAssets(id);
      setDownloads(prev => {
        const next = prev.filter(d => d.id !== id);
        saveDownloads(next);
        return next;
      });
      refreshStorage();
    },
    [refreshStorage]
  );

  const deleteDownload = useCallback(
    async (id: string) => {
      await engine.deleteAssets(id);
      setDownloads(prev => {
        const next = prev.filter(d => d.id !== id);
        saveDownloads(next);
        return next;
      });
      refreshStorage();
    },
    [refreshStorage]
  );

  const retryDownload = useCallback(
    async (id: string) => {
      const record = downloads.find(d => d.id === id);
      if (!record) return;
      resumables.current.delete(id);
      await engine.ensureReady(id);
      updateRecord(id, { status: 'downloading', progress: 0, bytesWritten: 0, errorMessage: undefined });
      beginTransfer({ ...record, progress: 0, bytesWritten: 0 });
    },
    [downloads, beginTransfer, updateRecord]
  );

  const isDownloaded = useCallback(
    (id: string) => downloads.some(d => d.id === id && d.status === 'completed'),
    [downloads]
  );
  const getDownload = useCallback((id: string) => downloads.find(d => d.id === id), [downloads]);

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        storageBytes,
        isDownloaded,
        getDownload,
        startDownload,
        pauseDownload,
        resumeDownload,
        cancelDownload,
        deleteDownload,
        retryDownload,
        refreshStorage,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownloads = (): DownloadContextType => {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownloads must be used within a DownloadProvider');
  return ctx;
};
