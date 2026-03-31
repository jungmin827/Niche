import { useJitterBootstrap } from './hooks/useJitterBootstrap';

/** 앱 시작 시 온디바이스 모델 상태를 복구하는 null 컴포넌트. */
export function JitterBootstrap(): null {
  useJitterBootstrap();
  return null;
}
