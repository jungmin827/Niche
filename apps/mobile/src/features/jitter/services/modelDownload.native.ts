import * as FileSystem from 'expo-file-system/legacy';

// Qwen3-1.7B Q4_K_M GGUF (~1.1 GB)
// CDN URL은 실제 배포 시 S3/Cloudflare 주소로 교체
const MODEL_CDN_URL =
  'https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/resolve/main/qwen3-1.7b-q4_k_m.gguf';

const MODEL_FILENAME = 'qwen3-1.7b-q4_k_m.gguf';

export function getModelPath(): string {
  return `${FileSystem.documentDirectory}jitter/${MODEL_FILENAME}`;
}

export async function isModelDownloaded(): Promise<boolean> {
  const path = getModelPath();
  const info = await FileSystem.getInfoAsync(path);
  return info.exists && !info.isDirectory;
}

type ProgressCallback = (progress: number) => void;

export async function downloadModel(onProgress: ProgressCallback): Promise<string> {
  const modelPath = getModelPath();
  const modelDir = `${FileSystem.documentDirectory}jitter/`;

  const dirInfo = await FileSystem.getInfoAsync(modelDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    MODEL_CDN_URL,
    modelPath,
    {},
    (downloadProgress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
      if (totalBytesExpectedToWrite > 0) {
        onProgress(totalBytesWritten / totalBytesExpectedToWrite);
      }
    },
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || result.status !== 200) {
    // 실패 시 불완전한 파일 삭제
    await FileSystem.deleteAsync(modelPath, { idempotent: true });
    throw new Error(`Model download failed with status: ${result?.status ?? 'unknown'}`);
  }

  return modelPath;
}

export async function deleteModel(): Promise<void> {
  const modelPath = getModelPath();
  await FileSystem.deleteAsync(modelPath, { idempotent: true });
}
