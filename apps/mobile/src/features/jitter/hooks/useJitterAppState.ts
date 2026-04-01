import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { loadModel, releaseModel } from '../services/onDeviceLLM';
import { useJitterOnDeviceStore } from '../store';
import { isModelDownloaded } from '../services/modelDownload';

/**
 * 앱 상태(foreground/background) 변화에 따라 온디바이스 모델을 메모리에서 해제하고 복구한다.
 * JitterChatScreen이 마운트된 동안에만 활성화한다.
 */
export function useJitterAppState(): void {
  const status = useJitterOnDeviceStore((s) => s.status);
  const modelPath = useJitterOnDeviceStore((s) => s.modelPath);
  const { reset, setFailed } = useJitterOnDeviceStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (status !== 'ready' || !modelPath) return;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev === 'active' && nextState === 'background') {
        // 백그라운드 진입: 메모리 해제
        releaseModel();
      } else if (prev === 'background' && nextState === 'active') {
        // 포그라운드 복귀: 모델 재로드
        try {
          await loadModel(modelPath);
        } catch {
          // 재로드 실패 — 파일이 남아 있으면 failed(재시도 가능), 없으면 idle로 리셋
          const stillExists = await isModelDownloaded().catch(() => false);
          if (stillExists) {
            setFailed('모델을 다시 불러오지 못했습니다. 앱을 재시작하거나 재다운로드해 주세요.');
          } else {
            reset();
          }
        }
      }
    });

    return () => subscription.remove();
  }, [status, modelPath, reset, setFailed]);
}
