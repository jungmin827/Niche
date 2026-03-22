import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppCard from '../../../src/components/ui/AppCard';
import AppText from '../../../src/components/ui/AppText';
import AppButton from '../../../src/components/ui/AppButton';
import { useBlogDetailQuery } from '../../../src/features/blog/hooks';
import { toApiError } from '../../../src/lib/error';

type ParsedBlock =
  | { type: 'image'; content: string }
  | { type: 'text'; content: string };

function parseBodyMdToBlocks(bodyMd: string): ParsedBlock[] {
  const chunks = bodyMd.split(/\n\n+/);
  return chunks
    .map((chunk) => {
      const trimmed = chunk.trim();
      const imageMatch = trimmed.match(/^!\[.*?\]\((.+?)\)$/);
      if (imageMatch) {
        return { type: 'image' as const, content: imageMatch[1] };
      }
      return { type: 'text' as const, content: trimmed };
    })
    .filter((block) => block.content.length > 0);
}

function formatBlogDate(isoString: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoString));
}

export default function BlogDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { width } = useWindowDimensions();
  const detailQuery = useBlogDetailQuery(postId ?? '');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      {/* Header bar */}
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
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color="#111" />
        </Pressable>
        <View />
      </View>

      {detailQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
            Loading...
          </AppText>
        </View>
      ) : detailQuery.isError ? (
        <View style={{ flex: 1, padding: 24 }}>
          <AppCard className="gap-4 bg-[#F6F6F4]">
            <AppText variant="title">Could not load post.</AppText>
            <AppText variant="bodySmall" style={{ color: '#555555' }}>
              {toApiError(detailQuery.error).message}
            </AppText>
            <AppButton
              label="Retry"
              variant="secondary"
              onPress={() => detailQuery.refetch()}
            />
          </AppCard>
        </View>
      ) : detailQuery.data ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Title */}
          <AppText
            variant="hero"
            style={{
              fontSize: 24,
              fontWeight: '600',
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 8,
            }}
          >
            {detailQuery.data.post.title}
          </AppText>

          {/* Date */}
          <AppText
            variant="caption"
            style={{ color: '#8A8A84', paddingHorizontal: 20, paddingBottom: 24 }}
          >
            {formatBlogDate(detailQuery.data.post.publishedAt)}
          </AppText>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: '#D9D9D4' }} />

          {/* Content blocks */}
          {parseBodyMdToBlocks(detailQuery.data.post.bodyMd).map((block, index) => {
            if (block.type === 'image') {
              return (
                <Image
                  key={index}
                  source={{ uri: block.content }}
                  style={{ width, height: (width * 5) / 7 }}
                  contentFit="cover"
                />
              );
            }
            if (block.content === '') {
              return <View key={index} style={{ height: 8 }} />;
            }
            return (
              <AppText
                key={index}
                variant="body"
                style={{ lineHeight: 26, paddingHorizontal: 20, paddingVertical: 12 }}
              >
                {block.content}
              </AppText>
            );
          })}

          <View style={{ height: 80 }} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
