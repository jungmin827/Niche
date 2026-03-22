import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import Screen from '../../../components/layout/Screen';
import TopBar from '../../../components/layout/TopBar';
import SharePreview from '../../../components/share/SharePreview';
import AppButton from '../../../components/ui/AppButton';
import AppCard from '../../../components/ui/AppCard';
import AppInput from '../../../components/ui/AppInput';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { toApiError } from '../../../lib/error';
import { useSessionDetailQuery } from '../../session/hooks';
import { buildHighlightCaption, buildHighlightTitle, buildShareModel } from '../helpers';
import { useCreateHighlightMutation } from '../hooks';
import { captureTemplate, shareCapturedTemplate } from '../capture';
import { HighlightTemplateCode } from '../types';

const TEMPLATE_OPTIONS: HighlightTemplateCode[] = ['mono_story_v1', 'mono_story_v2'];

export default function SharePreviewScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const detailQuery = useSessionDetailQuery(sessionId ?? '');
  const createHighlightMutation = useCreateHighlightMutation();
  const previewRef = useRef<View>(null);
  const [templateCode, setTemplateCode] = useState<HighlightTemplateCode>('mono_story_v1');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');

  const session = detailQuery.data?.session ?? null;
  const note = detailQuery.data?.note ?? null;

  const defaultTitle = session ? buildHighlightTitle(session) : '';
  const defaultCaption = buildHighlightCaption(note);

  const effectiveTitle = title.trim() || defaultTitle;
  const effectiveCaption = caption.trim() || defaultCaption;

  const model = useMemo(() => {
    if (!session || !note) {
      return null;
    }

    return {
      ...buildShareModel({
        session,
        note,
        templateCode,
      }),
      title: effectiveTitle,
      caption: effectiveCaption,
      templateCode,
    };
  }, [effectiveCaption, effectiveTitle, note, session, templateCode]);

  if (!sessionId) {
    return (
      <Screen>
        <TopBar title="하이라이트 미리보기" leadingLabel="닫기" onLeadingPress={() => router.back()} />
        <AppText variant="body">세션을 찾을 수 없습니다.</AppText>
      </Screen>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <Screen>
        <TopBar title="하이라이트 미리보기" leadingLabel="닫기" onLeadingPress={() => router.back()} />
        <AppText variant="body">세션 기록을 불러오는 중입니다.</AppText>
      </Screen>
    );
  }

  if (detailQuery.isError) {
    return (
      <Screen>
        <TopBar title="하이라이트 미리보기" leadingLabel="닫기" onLeadingPress={() => router.back()} />
        <AppCard className="gap-4 bg-[#F6F6F4]">
          <AppText variant="title">세션 기록을 불러오지 못했습니다.</AppText>
          <AppText variant="bodySmall" className="text-[#555555]">
            {toApiError(detailQuery.error).message}
          </AppText>
          <AppButton label="다시 시도" variant="secondary" onPress={() => detailQuery.refetch()} />
        </AppCard>
      </Screen>
    );
  }

  if (!session || !note) {
    return (
      <Screen>
        <TopBar title="하이라이트 미리보기" leadingLabel="닫기" onLeadingPress={() => router.back()} />
        <View className="gap-4">
          <AppText variant="body">기록을 먼저 남겨야 하이라이트를 만들 수 있습니다.</AppText>
          <AppButton
            label="기록 보기"
            onPress={() =>
              router.replace({
                pathname: routes.sessionNoteModal,
                params: { sessionId },
              })
            }
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar
        title="하이라이트 미리보기"
        subtitle="디자인을 만드는 대신, 잘 정리된 결과를 고릅니다."
        leadingLabel="닫기"
        onLeadingPress={() => router.back()}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-8 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="overflow-hidden rounded-[28px]" ref={previewRef}>
          {model ? <SharePreview model={model} /> : null}
        </View>

        <AppCard className="gap-6">
          <View className="gap-3">
            <AppText variant="title">형식</AppText>
            <AppText variant="bodySmall" className="text-[#555555]">
              잘 편집된 결과를 고르면 됩니다.
            </AppText>
          </View>

          <View className="flex-row gap-3">
            {TEMPLATE_OPTIONS.map((option) => {
              const selected = option === templateCode;

              return (
                <Pressable
                  key={option}
                  className={`rounded-full border px-4 py-3 ${
                    selected ? 'border-black bg-black' : 'border-[#D9D9D4] bg-[#F6F6F4]'
                  }`}
                  onPress={() => setTemplateCode(option)}
                >
                  <AppText color={selected ? 'inverse' : 'primary'} variant="bodySmall">
                    {option === 'mono_story_v1' ? '형식 A' : '형식 B'}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <AppInput
            label="제목"
            placeholder={defaultTitle}
            value={title}
            onChangeText={setTitle}
          />
          <AppInput
            label="한 줄"
            placeholder={defaultCaption}
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
            className="min-h-[104px]"
          />
        </AppCard>

        <View className="rounded-[20px] border border-[#D9D9D4] bg-[#F6F6F4] px-5 py-5">
          <AppText variant="bodySmall" className="text-[#555555]">
            텍스트는 짧게 둘수록 카드가 더 또렷해집니다.
          </AppText>
        </View>

        <View className="gap-3">
          <AppButton
            disabled={createHighlightMutation.isPending}
            label="하이라이트로 저장"
            onPress={async () => {
              try {
                const renderedImagePath = await captureTemplate(previewRef);
                const response = await createHighlightMutation.mutateAsync({
                  sourceType: 'session',
                  sessionId,
                  bundleId: null,
                  title: effectiveTitle,
                  caption: effectiveCaption,
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
          />
          <AppButton
            label="공유하기"
            variant="secondary"
            onPress={async () => {
              try {
                await shareCapturedTemplate(previewRef);
              } catch (error) {
                Alert.alert('공유할 수 없어요.', toApiError(error).message);
              }
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
