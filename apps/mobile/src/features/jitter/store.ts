import { create } from 'zustand';

export type OnDeviceStatus = 'idle' | 'downloading' | 'ready' | 'failed';

type JitterOnDeviceStore = {
  status: OnDeviceStatus;
  downloadProgress: number; // 0.0 – 1.0
  modelPath: string | null;
  errorMessage: string | null;

  setDownloading: (progress: number) => void;
  setReady: (modelPath: string) => void;
  setFailed: (errorMessage: string) => void;
  reset: () => void;
};

export const useJitterOnDeviceStore = create<JitterOnDeviceStore>((set) => ({
  status: 'idle',
  downloadProgress: 0,
  modelPath: null,
  errorMessage: null,

  setDownloading: (progress) =>
    set({ status: 'downloading', downloadProgress: progress, errorMessage: null }),

  setReady: (modelPath) =>
    set({ status: 'ready', modelPath, downloadProgress: 1, errorMessage: null }),

  setFailed: (errorMessage) =>
    set({ status: 'failed', errorMessage, downloadProgress: 0 }),

  reset: () =>
    set({ status: 'idle', downloadProgress: 0, modelPath: null, errorMessage: null }),
}));
