/**
 * Platform-agnostic helpers for the Downloads feature: URL/record builders
 * and display formatting. The actual transfer/storage work lives in
 * `downloadEngine.native.ts` / `downloadEngine.web.ts`.
 */
import { Movie } from '../api/tmdb';
import { DownloadRecord } from '../types/downloads';

/** Swap a TMDB image URL to its highest-resolution variant. */
const toOriginalSize = (url: string): string =>
  url.replace('/t/p/w500', '/t/p/original').replace('/t/p/w1280', '/t/p/original');

export const buildInitialRecord = (movie: Movie): DownloadRecord => ({
  id: movie.imdbID,
  contentType: movie.contentType,
  title: movie.Title,
  posterUrl: movie.Poster,
  backdropUrl: movie.Backdrop || undefined,
  year: movie.Year,
  runtime: movie.Runtime,
  genre: movie.Genre,
  plot: movie.Plot,
  imdbRating: movie.imdbRating,
  status: 'queued',
  progress: 0,
  bytesWritten: 0,
  bytesTotal: 0,
  speedBps: 0,
  localVideoPath: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

/**
 * The primary (resumable, progress-tracked) asset for a download — the
 * highest-res backdrop, falling back to the poster if no backdrop exists.
 * Swapping this URL for a real video file is the only change needed to
 * graduate to true offline video downloads once one is available.
 */
export const primaryAssetUrl = (record: Pick<DownloadRecord, 'backdropUrl' | 'posterUrl'>): string =>
  toOriginalSize(record.backdropUrl || record.posterUrl);

export const posterAssetUrl = (record: Pick<DownloadRecord, 'posterUrl'>): string =>
  toOriginalSize(record.posterUrl);

export const buildMetadata = (record: DownloadRecord) => ({
  id: record.id,
  contentType: record.contentType,
  title: record.title,
  year: record.year,
  runtime: record.runtime,
  genre: record.genre,
  plot: record.plot,
  imdbRating: record.imdbRating,
  savedAt: Date.now(),
  note:
    'Offline info package — poster, backdrop & metadata only. Video playback still requires a connection.',
});

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
};

export const formatEta = (seconds: number): string => {
  if (!isFinite(seconds) || seconds <= 0) return '';
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins}m left`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
};

/** Instantaneous transfer speed, e.g. "3.2 MB/s". */
export const formatSpeed = (bytesPerSecond: number): string => {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '';
  const kb = bytesPerSecond / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB/s`;
  return `${(kb / 1024).toFixed(1)} MB/s`;
};
