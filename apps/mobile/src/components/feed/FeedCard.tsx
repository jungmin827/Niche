import { Feather } from '@expo/vector-icons';
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
  const initial = author.name.charAt(0).toUpperCase();

  return (
    <Pressable onPress={onPress} style={{ marginBottom: 40 }}>
      {/* Author row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <View
          style={{
            width: 32,
            height: 32,
            backgroundColor: '#111',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="caption" style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
            {initial}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText variant="bodySmall" style={{ color: '#000', fontWeight: '600' }}>
            {author.name}
          </AppText>
          <AppText variant="caption" style={{ color: '#8A8A84' }}>
            {author.rankTitle} · {time}
          </AppText>
        </View>
      </View>

      {/* Content */}
      <View style={{ marginBottom: 14 }}>
        <AppText
          variant="body"
          style={{ color: '#000', lineHeight: 26 }}
          numberOfLines={3}
        >
          {content}
        </AppText>
        <AppText variant="bodySmall" style={{ color: '#8A8A84', marginTop: 4 }}>
          more
        </AppText>
      </View>

      {/* Image */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: 220, marginBottom: 14 }}
          resizeMode="cover"
        />
      ) : null}

      {/* Footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="caption" style={{ color: '#8A8A84' }}>
          {tag ?? ''}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name="heart" size={13} color="#555" />
            <AppText variant="caption" style={{ color: '#8A8A84' }}>{likes}</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name="bookmark" size={13} color="#555" />
            <AppText variant="caption" style={{ color: '#8A8A84' }}>{bookmarks}</AppText>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: '#F0F0EE', marginTop: 28 }} />
    </Pressable>
  );
}
