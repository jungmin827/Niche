import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SharePreview from '../../../components/share/SharePreview';
import AppText from '../../../components/ui/AppText';
import { toApiError } from '../../../lib/error';
import { useSessionDetailQuery } from '../../session/hooks';
import { buildHighlightCaption, buildHighlightTitle, buildShareModel } from '../helpers';
import { useCreateHighlightMutation } from '../hooks';
import { captureTemplate, shareCapturedTemplate } from '../capture';
import { HighlightTemplateCode } from '../types';
import { routes } from '../../../constants/routes';

const TEMPLATE_OPTIONS: { code: HighlightTemplateCode; label: string }[] = [
  { code: 'mono_story_v1', label: 'Style A' },
  { code: 'mono_story_v2', label: 'Style B' },
];

export default function SharePreviewScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const detailQuery = useSessionDetailQuery(sessionId ?? '');
  const createHighlightMutation = useCreateHighlightMutation();
  const previewRef = useRef<View>(null);
  const [templateCode, setTemplateCode] = useState<HighlightTemplateCode>('mono_story_v1');

  const session = detailQuery.data?.session ?? null;
  const note = detailQuery.data?.note ?? null;

  const model = useMemo(() => {
    if (!session || !note) return null;
    return buildShareModel({ session, note, templateCode });
  }, [session, note, templateCode]);

  if (!sessionId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="body">세션을 찾을 수 없습니다.</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="body">불러오는 중...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
        }}
      >
        <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
          <AppText variant="body" style={{ fontSize: 20 }}>←</AppText>
        </Pressable>
        <AppText variant="bodySmall" style={{ color: '#000' }}>
          Export
        </AppText>
      </View>

      {/* Center — 9:16 template preview */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 }}>
        <View
          ref={previewRef}
          style={{
            width: '72%',
            aspectRatio: 9 / 16,
            overflow: 'hidden',
          }}
        >
          {model ? <SharePreview model={model} /> : (
            <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="bodySmall" color="inverse" style={{ color: '#888' }}>
                기록을 먼저 저장하세요.
              </AppText>
            </View>
          )}
        </View>
      </View>

      {/* Bottom controls */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 24, gap: 16 }}>
        {/* Style selector */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32 }}>
          {TEMPLATE_OPTIONS.map((opt) => {
            const selected = opt.code === templateCode;
            return (
              <Pressable key={opt.code} onPress={() => setTemplateCode(opt.code)}>
                <AppText
                  variant="bodySmall"
                  style={{
                    color: selected ? '#000' : '#aaa',
                    fontWeight: selected ? '600' : '400',
                  }}
                >
                  {opt.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Share to Story */}
        <Pressable
          onPress={async () => {
            try {
              await shareCapturedTemplate(previewRef);
            } catch (error) {
              Alert.alert('공유할 수 없어요.', toApiError(error).message);
            }
          }}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#333' : '#000',
            paddingVertical: 16,
            alignItems: 'center',
          })}
        >
          <AppText variant="bodySmall" color="inverse" style={{ color: '#fff' }}>
            Share to Story
          </AppText>
        </Pressable>

        {/* Save Image (highlight 저장) */}
        <Pressable
          onPress={async () => {
            if (!session || !model) return;
            try {
              const renderedImagePath = await captureTemplate(previewRef);
              const response = await createHighlightMutation.mutateAsync({
                sourceType: 'session',
                sessionId: session.id,
                bundleId: null,
                title: buildHighlightTitle(session),
                caption: buildHighlightCaption(note),
                templateCode,
                renderedImagePath,
                sourcePhotoPath: null,
                visibility: 'public',
              });
              router.replace(routes.archiveHighlightDetail(response.highlight.id));
            } catch (error) {
              Alert.alert('저장 중 문제가 생겼어요.', toApiError(error).message);
            }
          }}
          disabled={createHighlightMutation.isPending || !model}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: '#000',
            paddingVertical: 16,
            alignItems: 'center',
            opacity: pressed || createHighlightMutation.isPending ? 0.5 : 1,
          })}
        >
          <AppText variant="bodySmall" style={{ color: '#000' }}>
            {createHighlightMutation.isPending ? '저장 중...' : 'Save Image'}
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
