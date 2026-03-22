import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar from '../../../src/components/layout/TopBar';
import AppButton from '../../../src/components/ui/AppButton';
import AppCard from '../../../src/components/ui/AppCard';
import AppText from '../../../src/components/ui/AppText';
import { useBlogListQuery } from '../../../src/features/blog/hooks';
import { BlogPostListItem } from '../../../src/features/blog/types';
import { routes } from '../../../src/constants/routes';
import { toApiError } from '../../../src/lib/error';

function formatBlogDate(isoString: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoString));
}

function BlogPostCard({ post }: { post: BlogPostListItem }) {
  const { width } = useWindowDimensions();

  return (
    <Pressable
      onPress={() => router.push(routes.blogDetail(post.id))}
      style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#D9D9D4' }}
    >
      {post.coverImageUrl ? (
        <Image
          source={{ uri: post.coverImageUrl }}
          style={{ width, height: (width * 5) / 7 }}
          contentFit="cover"
        />
      ) : null}
      <View style={{ padding: 20 }}>
        <AppText variant="title" numberOfLines={2}>
          {post.title}
        </AppText>
        {post.excerpt ? (
          <AppText
            variant="bodySmall"
            style={{ color: '#555555', marginTop: 8 }}
            numberOfLines={2}
          >
            {post.excerpt}
          </AppText>
        ) : null}
        <AppText variant="caption" style={{ color: '#8A8A84', marginTop: 12 }}>
          {formatBlogDate(post.publishedAt)}
        </AppText>
      </View>
    </Pressable>
  );
}

export default function BlogHomeScreen() {
  const listQuery = useBlogListQuery();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
        <TopBar
          title="Blog"
          leadingLabel="New Post"
          onLeadingPress={() => router.push(routes.blogCompose)}
        />
      </View>

      {listQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
            Loading...
          </AppText>
        </View>
      ) : listQuery.isError ? (
        <View style={{ paddingHorizontal: 24 }}>
          <AppCard className="gap-4 bg-[#F6F6F4]">
            <AppText variant="title">Could not load posts.</AppText>
            <AppText variant="bodySmall" style={{ color: '#555555' }}>
              {toApiError(listQuery.error).message}
            </AppText>
            <AppButton
              label="Retry"
              variant="secondary"
              onPress={() => listQuery.refetch()}
            />
          </AppCard>
        </View>
      ) : listQuery.data && listQuery.data.length > 0 ? (
        <FlatList
          data={listQuery.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BlogPostCard post={item} />}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
            No posts yet.
          </AppText>
          <AppButton
            label="Write your first post"
            variant="secondary"
            fullWidth={false}
            onPress={() => router.push(routes.blogCompose)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
