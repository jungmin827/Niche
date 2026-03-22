import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import ArchiveHero from '../../../components/archive/ArchiveHero';
import HighlightCard from '../../../components/archive/HighlightCard';
import Screen from '../../../components/layout/Screen';
import TopBar from '../../../components/layout/TopBar';
import AppButton from '../../../components/ui/AppButton';
import AppText from '../../../components/ui/AppText';
import AppCard from '../../../components/ui/AppCard';
import { toApiError } from '../../../lib/error';
import { routes } from '../../../constants/routes';
import { supabase } from '../../../lib/supabase';
import { useArchiveQuery } from '../hooks';

async function handleSignOut() {
  await supabase?.auth.signOut();
  router.replace('/(auth)/welcome');
}

export default function ArchiveHomeScreen() {
  const archiveQuery = useArchiveQuery();
  const archive = archiveQuery.data;

  return (
    <Screen scroll>
      <TopBar
        title="Archive"
        subtitle="Your world, curated."
        leadingLabel="Sign out"
        onLeadingPress={handleSignOut}
      />

      {archiveQuery.isLoading ? (
        <AppText variant="body">Loading archive...</AppText>
      ) : archiveQuery.isError ? (
        <AppCard className="gap-4 bg-[#F6F6F4]">
          <AppText variant="title">Couldn't load archive.</AppText>
          <AppText variant="bodySmall" className="text-[#555555]">
            {toApiError(archiveQuery.error).message}
          </AppText>
          <AppButton label="Retry" variant="secondary" onPress={() => archiveQuery.refetch()} />
        </AppCard>
      ) : archive ? (
        <View className="gap-8">
          <ArchiveHero
            currentRankCode={archive.profile.currentRankCode}
            displayName={archive.profile.displayName}
            totalFocusMinutes={archive.stats.totalFocusMinutes}
            totalHighlights={archive.stats.totalHighlights}
          />

          <View className="gap-4">
            <AppText variant="title">Highlights</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-5 pr-6" style={{ paddingLeft: 20 }}>
                <Pressable
                  onPress={() => router.push(routes.highlightSessionPicker)}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    borderWidth: 1,
                    borderColor: '#D9D9D4',
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FAFAFA',
                  }}
                >
                  <Feather name="plus" size={20} color="#8A8A84" />
                </Pressable>
                {archive.highlights.items.map((highlight) => (
                  <HighlightCard
                    key={highlight.id}
                    highlight={highlight}
                    onPress={() => router.push(routes.highlightViewer(highlight.id))}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View className="gap-4">
            <AppText variant="title">Blog</AppText>
            {archive.blogPosts.items.length > 0 ? (
              archive.blogPosts.items.map((post) => (
                <Pressable
                  key={post.id}
                  onPress={() => router.push(routes.blogDetail(post.id))}
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: '#D9D9D4',
                    paddingVertical: 16,
                  }}
                >
                  <AppText variant="body" numberOfLines={2}>{post.title}</AppText>
                  {post.excerpt ? (
                    <AppText
                      variant="bodySmall"
                      style={{ color: '#8A8A84', marginTop: 4 }}
                      numberOfLines={2}
                    >
                      {post.excerpt}
                    </AppText>
                  ) : null}
                </Pressable>
              ))
            ) : (
              <View className="rounded-[20px] border border-dashed border-[#D9D9D4] bg-[#F6F6F4] px-5 py-6">
                <AppText variant="bodySmall" className="text-[#555555]">
                  No posts yet.
                </AppText>
                <AppText variant="bodySmall" className="mt-2 text-[#555555]">
                  Write down a passing thought.
                </AppText>
              </View>
            )}
          </View>
        </View>
      ) : (
        <AppText variant="body">Preparing your archive...</AppText>
      )}
    </Screen>
  );
}
