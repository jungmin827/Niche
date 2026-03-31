// Web stub — llama.rn is native-only.
// Metro resolves onDeviceLLM.native.ts on iOS/Android, this file on web.
import type { JitterMessage } from '../../../api/jitter';

export async function loadModel(_modelPath: string): Promise<void> {
  throw new Error('On-device LLM is not supported on web.');
}

export async function releaseModel(): Promise<void> {
  // no-op on web
}

export async function onDeviceChat(
  _messages: JitterMessage[],
  _contextSummary: string | null | undefined,
): Promise<string> {
  throw new Error('On-device LLM is not supported on web.');
}
