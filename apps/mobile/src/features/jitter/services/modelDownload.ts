// Web stub — expo-file-system/legacy is native-only.
// Metro resolves modelDownload.native.ts on iOS/Android, this file on web.

type ProgressCallback = (progress: number) => void;

export function getModelPath(): string {
  return '';
}

export async function isModelDownloaded(): Promise<boolean> {
  return false;
}

export async function downloadModel(_onProgress: ProgressCallback): Promise<string> {
  throw new Error('Model download is not supported on web.');
}

export async function deleteModel(): Promise<void> {
  // no-op on web
}
