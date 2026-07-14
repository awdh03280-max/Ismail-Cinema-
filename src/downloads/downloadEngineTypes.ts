/**
 * Shared contract implemented by `downloadEngine.native.ts` (real files via
 * expo-file-system) and `downloadEngine.web.ts` (fetch + AsyncStorage, since
 * expo-file-system has no real filesystem on web). `DownloadContext` only
 * talks to this interface, so it never needs to branch on platform itself.
 */

export interface EngineProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
}

export type EngineProgressCallback = (p: EngineProgress) => void;

export interface EngineResult {
  /** `file://...` on native, `webstore://<key>` on web — informational only. */
  localUri: string;
}

export interface EngineResumable {
  downloadAsync(): Promise<EngineResult | undefined>;
  resumeAsync(): Promise<EngineResult | undefined>;
  pauseAsync(): Promise<void>;
  cancelAsync(): Promise<void>;
}
