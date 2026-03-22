import { Image, Pressable, View } from 'react-native';
import AppText from '../ui/AppText';

type Props = {
  author: {
    name: string;
    rankTitle: string;
    avatarUrl?: string | null;
  };
  time: string;
  content: string;
  imageUrl?: string | null;
  tag?: string;
  likes?: number;
  bookmarks?: number;
  onPress?: () => void;
};

export default function FeedCard({
  author,
  time,
  content,
  imageUrl,
  tag,
  likes = 0,
  bookmarks = 0,
  onPress,
}: Props) {
  return (
    <Pressable onPress={onPress} style={{ marginBottom: 40 }}>
      {/* Author row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <View
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0' }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText variant="bodySmall" style={{ color: '#000', fontWeight: '600' }}>
            {author.name}
          </AppText>
          <AppText variant="caption" style={{ color: '#aaa' }}>
            {author.rankTitle} · {time}
          </AppText>
        </View>
      </View>

      {/* Content — 2 lines */}
      <View style={{ marginBottom: 14 }}>
        <AppText
          variant="body"
          style={{ color: '#000', lineHeight: 24 }}
          numberOfLines={2}
        >
          {content}{' '}
          <AppText variant="body" style={{ color: '#aaa' }}>
            Read more...
          </AppText>
        </AppText>
      </View>

      {/* Image */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: 220, borderRadius: 12, marginBottom: 14 }}
          resizeMode="cover"
        />
      ) : null}

      {/* Footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="caption" style={{ color: '#888' }}>
          {tag ?? ''}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText variant="caption" style={{ color: '#000', fontSize: 15 }}>♡</AppText>
            <AppText variant="caption" style={{ color: '#aaa', fontSize: 11 }}>{likes}</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText variant="caption" style={{ color: '#000', fontSize: 15 }}>⊡</AppText>
            <AppText variant="caption" style={{ color: '#aaa', fontSize: 11 }}>{bookmarks}</AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
