import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { loadModel, releaseModel } from '../services/onDeviceLLM';
import { useJitterOnDeviceStore } from '../store';

/**
 * 앱 상태(foreground/background) 변화에 따라 온디바이스 모델을 메모리에서 해제하고 복구한다.
 * JitterChatScreen이 마운트된 동안에만 활성화한다.
 */
export function useJitterAppState(): void {
  const status = useJitterOnDeviceStore((s) => s.status);
  const modelPath = useJitterOnDeviceStore((s) => s.modelPath);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (status !== 'ready' || !modelPath) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev === 'active' && nextState === 'background') {
        // 백그라운드 진입: 메모리 해제
        releaseModel();
      } else if (prev === 'background' && nextState === 'active') {
        // 포그라운드 복귀: 모델 재로드 (llama.rn은 이미 로드된 경우 no-op)
        loadModel(modelPath).catch(() => {
          // 재로드 실패 시 무시 — 다음 메시지 전송 시 재시도됨
        });
      }
    });

    return () => subscription.remove();
  }, [status, modelPath]);
}
