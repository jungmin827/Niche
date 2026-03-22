import { Feather } from '@expo/vector-icons';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeedCard from '../../../src/components/feed/FeedCard';
import AppText from '../../../src/components/ui/AppText';

// TODO: replace with real API data from GET /v1/feed
const MOCK_POSTS = [
  {
    id: '1',
    author: { name: 'Sarah Chen', rankTitle: 'Focus', avatarUrl: null },
    time: '2h',
    content:
      'The paradox of modern thought is that we seek clarity in an age of information overload. Perhaps the answer lies not in consuming more, but in pausing to reflect deeply on less. What if depth, not breadth, is the key to understanding?',
    imageUrl:
      'https://images.unsplash.com/photo-1588333238932-00b5d607f7e1?w=800&q=80',
    tag: '#Philosophy',
    likes: 12,
    bookmarks: 3,
  },
  {
    id: '2',
    author: { name: 'Marcus Webb', rankTitle: 'Reflection', avatarUrl: null },
    time: '4h',
    content:
      'Architecture teaches us about intention. Every line, every space has purpose. Our thoughts deserve the same careful construction. Building a practice of mindful thinking is like designing a home for our ideas.',
    imageUrl:
      'https://images.unsplash.com/photo-1637043756935-c60895cc05df?w=800&q=80',
    tag: '#Design',
    likes: 28,
    bookmarks: 7,
  },
  {
    id: '3',
    author: { name: 'Elena Rodriguez', rankTitle: 'Deep Dive', avatarUrl: null },
    time: '6h',
    content:
      "The ritual of reading isn't just about acquiring knowledge — it's about creating a sacred space for dialogue with brilliant minds across time. Each page turned is a conversation.",
    imageUrl:
      'https://images.unsplash.com/photo-1598620616655-7fce1a6fdf87?w=800&q=80',
    tag: '#Reading',
    likes: 45,
    bookmarks: 12,
  },
  {
    id: '4',
    author: { name: 'James Park', rankTitle: 'Contemplation', avatarUrl: null },
    time: '8h',
    content:
      'Writing by hand forces slowness. In an era of instant communication, the deliberate pace of pen on paper becomes an act of resistance. Each stroke is a meditation.',
    imageUrl: null,
    tag: '#Writing',
    likes: 34,
    bookmarks: 9,
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#D9D9D4',
        }}
      >
        <AppText variant="title" style={{ fontSize: 20, letterSpacing: -0.5 }}>
          NichE
        </AppText>
        <Feather name="search" size={20} color="#111" />
      </View>

      {/* Feed */}
      <FlatList
        data={MOCK_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedCard
            author={item.author}
            time={item.time}
            content={item.content}
            imageUrl={item.imageUrl}
            tag={item.tag}
            likes={item.likes}
            bookmarks={item.bookmarks}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
