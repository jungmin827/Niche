import { useEffect } from 'react';
import { getModelPath, isModelDownloaded } from '../services/modelDownload';
import { useJitterOnDeviceStore } from '../store';

/**
 * 앱 시작 시 모델이 이미 다운로드되어 있으면 store를 ready로 복구한다.
 * 루트에서 한 번만 호출한다.
 */
export function useJitterBootstrap(): void {
  const { status, setReady } = useJitterOnDeviceStore();

  useEffect(() => {
    if (status !== 'idle') return;

    isModelDownloaded().then((exists) => {
      if (exists) {
        setReady(getModelPath());
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
