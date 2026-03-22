import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { Highlight } from '../../features/share/types';
import { buildShareModel } from '../../features/share/helpers';
import { Session, SessionNote } from '../../features/session/types';
import AppText from '../ui/AppText';
import SharePreview from '../share/SharePreview';

type Props = {
  highlight: Highlight;
  session?: Session | null;
  note?: SessionNote | null;
  onPress?: () => void;
};

export default function HighlightCard({ highlight, session, note, onPress }: Props) {
  const model =
    session &&
    buildShareModel({
      session,
      note: note ?? null,
      templateCode: highlight.templateCode,
      rankLabel: highlight.author?.currentRankCode ?? 'Surface',
    });

  return (
    <Pressable className="w-[220px] gap-3" onPress={onPress}>
      <View className="overflow-hidden rounded-[24px]">
        {model ? (
          <SharePreview model={model} />
        ) : highlight.renderedImageUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: highlight.renderedImageUrl }}
            style={{ width: '100%', aspectRatio: 9 / 16, backgroundColor: '#F6F6F4' }}
          />
        ) : (
          <View className="aspect-[9/16] rounded-[24px] border border-[#D9D9D4] bg-[#F6F6F4] px-5 py-6">
            <AppText variant="title">{highlight.title}</AppText>
          </View>
        )}
      </View>
      <View className="gap-2 px-1">
        <AppText variant="body" numberOfLines={1}>
          {highlight.title}
        </AppText>
        <AppText variant="bodySmall" className="text-[#555555]" numberOfLines={2}>
          {highlight.caption}
        </AppText>
        <AppText variant="caption" className="text-[#8A8A84]">
          하이라이트
        </AppText>
      </View>
    </Pressable>
  );
}
