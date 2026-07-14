/**
 * Downloads feature — type definitions.
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * The app's player streams via third-party embeds (vidsrc.to etc.) which do
 * not expose a direct video file (mp4/m3u8), so there is nothing to actually
 * download for true offline video playback today. Instead, "downloading" a
 * title fetches and stores an **offline info package** — poster, backdrop,
 * and metadata — locally via `expo-file-system`'s resumable download API
 * (real progress, real pause/resume/cancel, real bytes on disk).
 *
 * The engine is intentionally built around `FileSystem.createDownloadResumable`
 * against a single primary asset URL. When a real streamable video file URL
 * becomes available, swap `buildDownloadParts()` in `downloadManager.ts` to
 * point its primary part at the video file — every other piece (progress,
 * pause/resume/cancel, storage accounting, the Downloads screen, and the
 * Movie Details button) keeps working unchanged.
 */

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface DownloadRecord {
  /** imdbID / TMDB id of the title. */
  id: string;
  contentType: 'movie' | 'tv';
  title: string;
  posterUrl: string;
  backdropUrl?: string;
  year?: string;
  runtime?: string;
  genre?: string;
  plot?: string;
  imdbRating?: string;

  status: DownloadStatus;
  /** 0-1 */
  progress: number;
  bytesWritten: number;
  bytesTotal: number;
  /** Instantaneous transfer speed in bytes/sec, used for the ETA readout. */
  speedBps: number;

  /** Local file:// paths once the offline package exists. */
  localPosterPath?: string;
  localBackdropPath?: string;
  localMetaPath?: string;
  /**
   * Reserved for a future real video file. Always null today — see the
   * architecture note above.
   */
  localVideoPath: string | null;

  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface StorageUsage {
  bytes: number;
  itemCount: number;
}
