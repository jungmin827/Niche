import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { JitterMessage } from '../../../api/jitter';
import AppText from '../../../components/ui/AppText';
import { useJitterAppState } from '../hooks/useJitterAppState';
import { useJitterChat } from '../hooks/useJitterChat';
import { downloadModel, isModelDownloaded } from '../services/modelDownload';
import { useJitterOnDeviceStore } from '../store';
import { useState } from 'react';

export default function JitterChatScreen() {
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<JitterMessage>>(null);

  const { messages, sending, errorLine, send, clearError } = useJitterChat();
  useJitterAppState();

  const onDeviceStatus = useJitterOnDeviceStore((s) => s.status);
  const downloadProgress = useJitterOnDeviceStore((s) => s.downloadProgress);
  const { setDownloading, setReady, setFailed } = useJitterOnDeviceStore();

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    clearError();
    await send(text);
  }, [input, sending, send, clearError]);

  const startDownload = useCallback(async () => {
    const alreadyDownloaded = await isModelDownloaded();
    if (alreadyDownloaded) {
      const { getModelPath } = await import('../services/modelDownload');
      setReady(getModelPath());
      return;
    }

    setDownloading(0);
    try {
      const modelPath = await downloadModel((progress) => {
        setDownloading(progress);
      });
      setReady(modelPath);
    } catch {
      setFailed('모델 다운로드에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요.');
    }
  }, [setDownloading, setReady, setFailed]);

  const handleActivateOnDevice = useCallback(() => {
    Alert.alert(
      'Enable offline AI',
      'This will download ~1.1 GB to your device. Wi-Fi is recommended.\n\nOnce downloaded, all conversations stay on your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', onPress: startDownload },
      ],
    );
  }, [startDownload]);

  const isOnDevice = onDeviceStatus === 'ready';
  const isDownloading = onDeviceStatus === 'downloading';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#D9D9D4',
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText variant="caption" style={{ color: '#111' }}>
            Jitter
          </AppText>
          <AppText variant="caption" style={{ color: '#8A8A84', marginTop: 4 }}>
            {isOnDevice ? 'On-device · private' : 'Cloud · responses generated remotely'}
          </AppText>
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Feather name="x" size={22} color="#111" />
        </Pressable>
      </View>

      {/* 다운로드 진행바 */}
      {isDownloading ? (
        <View
          style={{
            height: 2,
            backgroundColor: '#D9D9D4',
          }}
        >
          <View
            style={{
              height: 2,
              width: `${Math.round(downloadProgress * 100)}%`,
              backgroundColor: '#111111',
            }}
          />
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => `${i}`}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            paddingBottom: 24,
            flexGrow: 1,
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={{ paddingTop: 32, gap: 24 }}>
              <AppText variant="bodySmall" style={{ color: '#8A8A84', lineHeight: 22 }}>
                취향과 기록에 대해 이야기해 보세요.{'\n'}
                짧게라도 적으면 그에 맞춰 응답합니다.
              </AppText>

              {/* 온디바이스 활성화 배너 (idle 상태에서만 표시) */}
              {onDeviceStatus === 'idle' ? (
                <Pressable
                  onPress={handleActivateOnDevice}
                  style={{
                    borderWidth: 1,
                    borderColor: '#D9D9D4',
                    padding: 16,
                    gap: 6,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Enable offline AI"
                >
                  <AppText variant="bodySmall" style={{ color: '#111', fontWeight: '500' }}>
                    Enable offline AI
                  </AppText>
                  <AppText variant="caption" style={{ color: '#8A8A84', lineHeight: 18 }}>
                    Download ~1.1 GB once. All conversations stay on your device.{'\n'}
                    Wi-Fi recommended.
                  </AppText>
                </Pressable>
              ) : null}

              {/* 다운로드 중 안내 */}
              {isDownloading ? (
                <View style={{ gap: 6 }}>
                  <AppText variant="bodySmall" style={{ color: '#111' }}>
                    Downloading model… {Math.round(downloadProgress * 100)}%
                  </AppText>
                  <AppText variant="caption" style={{ color: '#8A8A84' }}>
                    You can already chat using the cloud while downloading.
                  </AppText>
                </View>
              ) : null}

              {/* 실패 재시도 */}
              {onDeviceStatus === 'failed' ? (
                <Pressable
                  onPress={handleActivateOnDevice}
                  style={{ gap: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Retry download"
                >
                  <AppText variant="bodySmall" style={{ color: '#111' }}>
                    Download failed. Tap to retry.
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={{
                alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                marginBottom: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 2,
                backgroundColor: item.role === 'user' ? '#EFEFEA' : '#FFFFFF',
                borderWidth: item.role === 'user' ? 0 : 1,
                borderColor: '#D9D9D4',
              }}
            >
              <AppText variant="bodySmall" style={{ color: '#111' }}>
                {item.content}
              </AppText>
            </View>
          )}
        />

        {errorLine ? (
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <AppText variant="caption" style={{ color: '#8A8A84' }}>
              {errorLine}
            </AppText>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: '#D9D9D4',
            gap: 12,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message"
            placeholderTextColor="#8A8A84"
            style={{
              flex: 1,
              minHeight: 40,
              maxHeight: 120,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: '#D9D9D4',
              color: '#111',
              fontSize: 15,
              lineHeight: 22,
            }}
            multiline
            editable={!sending}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !input.trim()}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: sending || !input.trim() ? 0.35 : 1,
            }}
            accessibilityRole="button"
            accessibilityLabel="Send"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <Feather name="send" size={20} color="#111" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
