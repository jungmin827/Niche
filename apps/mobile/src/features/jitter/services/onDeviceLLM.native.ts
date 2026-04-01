import { initLlama, type LlamaContext } from 'llama.rn';
import type { JitterMessage } from '../../../api/jitter';

const SYSTEM_PROMPT =
  'You are Jitter, the in-app companion for NichE — a quiet app for deep taste, reading, and reflection. ' +
  'You speak with a calm, editorial tone: precise, restrained, and respectful. ' +
  'Help the user think about their interests, sessions, reading, and inner life — without productivity jargon, ' +
  'without hype, and without judging them. Prefer Korean for all replies unless the user writes only in another language. ' +
  'Keep answers concise. Do not use emojis.';

let _ctx: LlamaContext | null = null;
let _loadedModelPath: string | null = null;

export async function loadModel(modelPath: string): Promise<void> {
  if (_ctx && _loadedModelPath === modelPath) return;

  await releaseModel();

  _ctx = await initLlama({
    model: modelPath,
    use_mlock: true,
    n_ctx: 2048,
    n_gpu_layers: 99, // GPU 오프로딩 최대화 (Metal on iOS)
  });
  _loadedModelPath = modelPath;
}

export async function releaseModel(): Promise<void> {
  if (_ctx) {
    await _ctx.release();
    _ctx = null;
    _loadedModelPath = null;
  }
}

export async function onDeviceChat(
  messages: JitterMessage[],
  contextSummary: string | null | undefined,
): Promise<string> {
  if (!_ctx) {
    throw new Error('On-device model is not loaded.');
  }

  // Qwen3 chat template 형식으로 프롬프트 조립
  // llama.rn은 chat completion 형식 지원
  const systemContent =
    contextSummary && contextSummary.trim()
      ? `${SYSTEM_PROMPT}\n\n---\nOptional context from the user's app:\n${contextSummary.trim()}`
      : SYSTEM_PROMPT;

  const chatMessages = [
    { role: 'system' as const, content: systemContent },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const result = await _ctx.completion(
    {
      messages: chatMessages,
      n_predict: 512,
      temperature: 0.7,
      top_p: 0.9,
      stop: ['<|im_end|>', '<|endoftext|>'],
    },
    // 스트리밍 토큰 콜백 (현재는 미사용, 추후 스트리밍 UX 확장용)
    (token) => {
      void token;
    },
  );

  const reply = (result.content || result.text).trim();
  if (!reply) {
    throw new Error('On-device model returned an empty response.');
  }
  return reply;
}
