import { useCallback, useState } from 'react';
import { postJitterMessage, type JitterMessage } from '../../../api/jitter';
import { ApiError } from '../../../lib/error';
import { onDeviceChat, loadModel } from '../services/onDeviceLLM';
import { useJitterOnDeviceStore } from '../store';

type SendResult = {
  reply: string;
  source: 'on-device' | 'cloud';
};

type UseJitterChatReturn = {
  messages: JitterMessage[];
  sending: boolean;
  errorLine: string | null;
  send: (input: string, contextSummary?: string | null) => Promise<void>;
  clearError: () => void;
};

export function useJitterChat(): UseJitterChatReturn {
  const [messages, setMessages] = useState<JitterMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [errorLine, setErrorLine] = useState<string | null>(null);

  const onDeviceStatus = useJitterOnDeviceStore((s) => s.status);
  const modelPath = useJitterOnDeviceStore((s) => s.modelPath);

  const send = useCallback(
    async (input: string, contextSummary?: string | null) => {
      const text = input.trim();
      if (!text || sending) return;

      const nextThread: JitterMessage[] = [...messages, { role: 'user', content: text }];
      setMessages(nextThread);
      setErrorLine(null);
      setSending(true);

      let result: SendResult;

      try {
        if (onDeviceStatus === 'ready' && modelPath) {
          // 온디바이스 경로
          await loadModel(modelPath);
          const reply = await onDeviceChat(nextThread, contextSummary);
          result = { reply, source: 'on-device' };
        } else {
          // 클라우드 fallback
          const { reply } = await postJitterMessage({
            messages: nextThread,
            contextSummary,
          });
          result = { reply, source: 'cloud' };
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
      } catch (e) {
        setMessages(messages);
        const msg =
          e instanceof ApiError
            ? e.message
            : '응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.';
        setErrorLine(msg);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, onDeviceStatus, modelPath],
  );

  const clearError = useCallback(() => setErrorLine(null), []);

  return { messages, sending, errorLine, send, clearError };
}
