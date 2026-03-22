import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../../components/ui/AppButton';
import AppCard from '../../../components/ui/AppCard';
import AppText from '../../../components/ui/AppText';
import { toApiError } from '../../../lib/error';
import { routes } from '../../../constants/routes';
import { BlogPostListItem } from '../../blog/types';
import { Highlight } from '../../share/types';
import { useArchiveQuery } from '../hooks';
import { useUploadAvatarMutation } from '../mutations';

const GRID_GAP = 8;
const GRID_PADDING = 24;

function formatFocusTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function BlogGridItem({
  post,
  width,
  height,
}: {
  post: BlogPostListItem;
  width: number;
  height: number;
}) {
  return (
    <Pressable
      onPress={() => router.push(routes.blogDetail(post.id))}
      style={{ width, height }}
    >
      {post.coverImageUrl ? (
        <Image
          source={{ uri: post.coverImageUrl }}
          style={{ width, height }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            width,
            height,
            backgroundColor: '#111',
            padding: 8,
            justifyContent: 'flex-end',
          }}
        >
          <AppText variant="caption" style={{ color: '#fff' }} numberOfLines={3}>
            {post.title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

function HighlightCircle({
  highlight,
  onPress,
}: {
  highlight: Highlight;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      {highlight.renderedImageUrl ? (
        <Image
          source={{ uri: highlight.renderedImageUrl }}
          style={{ width: 56, height: 56, borderRadius: 28 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#111',
          }}
        />
      )}
    </Pressable>
  );
}

export default function ArchiveHomeScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const archiveQuery = useArchiveQuery();
  const uploadAvatar = useUploadAvatarMutation();
  const archive = archiveQuery.data;

  const itemWidth = (screenWidth - GRID_PADDING * 2 - GRID_GAP) / 2;
  const itemHeight = (itemWidth * 5) / 7;

  const handleAvatarPress = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    uploadAvatar.mutate(result.assets[0].uri);
  };

  const renderBlogGrid = (posts: BlogPostListItem[]) => {
    const rows: React.ReactElement[] = [];
    for (let i = 0; i < posts.length; i += 2) {
      rows.push(
        <View
          key={posts[i].id}
          style={{ flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP }}
        >
          <BlogGridItem post={posts[i]} width={itemWidth} height={itemHeight} />
          {posts[i + 1] ? (
            <BlogGridItem post={posts[i + 1]} width={itemWidth} height={itemHeight} />
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>,
      );
    }
    return rows;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      {archiveQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
            Loading...
          </AppText>
        </View>
      ) : archiveQuery.isError ? (
        <View style={{ padding: 24 }}>
          <AppCard className="gap-4 bg-[#F6F6F4]">
            <AppText variant="title">Could not load archive.</AppText>
            <AppText variant="bodySmall" style={{ color: '#555555' }}>
              {toApiError(archiveQuery.error).message}
            </AppText>
            <AppButton
              label="Retry"
              variant="secondary"
              onPress={() => archiveQuery.refetch()}
            />
          </AppCard>
        </View>
      ) : archive ? (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {/* Section 1 — Profile header */}
          <View style={{ paddingHorizontal: GRID_PADDING, paddingTop: 20, paddingBottom: 20 }}>
            {/* Edit pencil — top right */}
            <Pressable
              onPress={() => router.push(routes.profileEdit(archive.profile.displayName))}
              style={{ position: 'absolute', top: 20, right: GRID_PADDING }}
              hitSlop={8}
            >
              <Feather name="edit-2" size={18} color="#8A8A84" />
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
              {/* Avatar */}
              <Pressable onPress={handleAvatarPress}>
                {archive.profile.avatarUrl ? (
                  <Image
                    source={{ uri: archive.profile.avatarUrl }}
                    style={{ width: 72, height: 72 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      backgroundColor: '#F6F6F4',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText variant="title">
                      {archive.profile.displayName?.[0] ?? '?'}
                    </AppText>
                  </View>
                )}
              </Pressable>

              {/* Info */}
              <View style={{ flex: 1, gap: 4 }}>
                <AppText style={{ fontSize: 18, fontWeight: '700', color: '#111' }}>
                  {archive.profile.displayName}
                </AppText>
                <AppText variant="caption" style={{ color: '#8A8A84' }}>
                  {archive.profile.currentRankCode}
                </AppText>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <AppText variant="caption" style={{ color: '#8A8A84' }}>
                    Sessions {archive.stats.totalSessions}
                  </AppText>
                  <AppText variant="caption" style={{ color: '#8A8A84' }}>·</AppText>
                  <AppText variant="caption" style={{ color: '#8A8A84' }}>
                    {formatFocusTime(archive.stats.totalFocusMinutes)}
                  </AppText>
                  <AppText variant="caption" style={{ color: '#8A8A84' }}>·</AppText>
                  <AppText variant="caption" style={{ color: '#8A8A84' }}>
                    {archive.stats.currentStreakDays} day streak
                  </AppText>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: '#D9D9D4', marginHorizontal: GRID_PADDING }} />

          {/* Section 2 — Highlights */}
          <View style={{ paddingTop: 20, paddingBottom: 20, gap: 12 }}>
            <AppText variant="title" style={{ paddingHorizontal: GRID_PADDING }}>
              Highlights
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingLeft: GRID_PADDING,
                  paddingRight: GRID_PADDING,
                }}
              >
                {/* + button */}
                <Pressable
                  onPress={() => router.push(routes.highlightSessionPicker)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    borderWidth: 1,
                    borderColor: '#D9D9D4',
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  <Feather name="plus" size={18} color="#8A8A84" />
                </Pressable>

                {archive.highlights.items.map((highlight: Highlight) => (
                  <HighlightCircle
                    key={highlight.id}
                    highlight={highlight}
                    onPress={() => router.push(routes.highlightViewer(highlight.id))}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={{ height: 1, backgroundColor: '#D9D9D4', marginHorizontal: GRID_PADDING }} />

          {/* Section 3 — Blog */}
          <View style={{ paddingHorizontal: GRID_PADDING, paddingTop: 20, paddingBottom: 40, gap: 12 }}>
            <AppText variant="title">Blog</AppText>
            {archive.blogPosts.items.length > 0 ? (
              renderBlogGrid(archive.blogPosts.items)
            ) : (
              <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
                No posts yet.
              </AppText>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
            Preparing your archive...
          </AppText>
        </View>
      )}
    </SafeAreaView>
  );
}
