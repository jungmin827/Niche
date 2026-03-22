import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { presignUpload, uploadImageToStorage } from '../../src/api/blog';
import AppText from '../../src/components/ui/AppText';
import { useCreateBlogPostMutation } from '../../src/features/blog/hooks';
import { Block, ImageBlock, TextBlock } from '../../src/features/blog/types';

const DRAFT_KEY = 'blog_compose_draft';

function generateId() {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

function makeTextBlock(): TextBlock {
  return { id: generateId(), type: 'text', content: '' };
}

function PhotoInsertButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        gap: 8,
      }}
    >
      <View style={{ height: 1, flex: 1, backgroundColor: '#F0F0EC' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Feather name="image" size={14} color="#8A8A84" />
        <AppText variant="caption" style={{ color: '#8A8A84' }}>
          Add photo
        </AppText>
      </View>
      <View style={{ height: 1, flex: 1, backgroundColor: '#F0F0EC' }} />
    </Pressable>
  );
}

export default function BlogComposeScreen() {
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([makeTextBlock()]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const scrollRef = useRef<ScrollView>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createPost = useCreateBlogPostMutation();

  // Load draft on mount
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (raw) {
          const draft = JSON.parse(raw) as { title?: string; blocks?: Block[] };
          if (draft.title) setTitle(draft.title);
          if (draft.blocks && draft.blocks.length > 0) setBlocks(draft.blocks);
        }
      })
      .catch(() => {})
      .finally(() => setDraftLoaded(true));
  }, []);

  // Debounced draft save
  useEffect(() => {
    if (!draftLoaded) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ title, blocks })).catch(() => {});
    }, 800);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [title, blocks, draftLoaded]);

  const hasTextContent = blocks.some(
    (b) => b.type === 'text' && (b as TextBlock).content.trim().length > 0,
  );
  const publishDisabled = isPublishing || title.trim().length === 0 || !hasTextContent;

  const updateTextBlock = (id: string, content: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id && b.type === 'text' ? { ...b, content } : b)),
    );
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => {
      const filtered = prev.filter((b) => b.id !== id);
      return filtered.length === 0 ? [makeTextBlock()] : filtered;
    });
  };

  const pickImageAt = useCallback(async (insertIndex: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const newImageBlock: ImageBlock = {
      id: generateId(),
      type: 'image',
      localUri: asset.uri,
      width: asset.width,
      height: asset.height,
    };
    const newTextBlock = makeTextBlock();

    setBlocks((prev) => {
      const next = [...prev];
      next.splice(insertIndex, 0, newImageBlock);
      const afterIndex = insertIndex + 1;
      if (!next[afterIndex] || next[afterIndex].type !== 'text') {
        next.splice(afterIndex, 0, newTextBlock);
      }
      return next;
    });

    setTimeout(() => {
      inputRefs.current[newTextBlock.id]?.focus();
    }, 0);
  }, []);

  const handlePublish = async () => {
    if (publishDisabled) return;
    setIsPublishing(true);

    try {
      // Upload image blocks
      const processedBlocks = await Promise.all(
        blocks.map(async (block) => {
          if (block.type !== 'image') return block;
          try {
            const presign = await presignUpload('image/jpeg', 'jpg');
            await uploadImageToStorage(presign, block.localUri);
            return { ...block, storagePath: presign.path } as ImageBlock;
          } catch {
            return block;
          }
        }),
      );

      // Serialize to bodyMd
      const bodyMd = processedBlocks
        .map((block) => {
          if (block.type === 'text') return (block as TextBlock).content;
          const img = block as ImageBlock;
          return `![](${img.storagePath ?? img.localUri})`;
        })
        .join('\n\n');

      const firstImage = processedBlocks.find((b): b is ImageBlock => b.type === 'image');
      const firstText = processedBlocks.find((b): b is TextBlock => b.type === 'text');

      const coverImagePath = firstImage?.storagePath ?? null;
      const excerpt = firstText ? firstText.content.slice(0, 100) || null : null;

      await createPost.mutateAsync({
        title: title.trim(),
        excerpt,
        bodyMd,
        coverImagePath,
        visibility: 'public',
      });

      await AsyncStorage.removeItem(DRAFT_KEY);
      router.back();
    } catch {
      Alert.alert('Publish failed', 'Could not publish. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      {/* [A] Header */}
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
          <AppText variant="bodySmall">Cancel</AppText>
        </Pressable>
        <AppText variant="caption" style={{ color: '#8A8A84' }}>
          New Post
        </AppText>
        <Pressable onPress={handlePublish} disabled={publishDisabled} hitSlop={8}>
          <AppText
            variant="bodySmall"
            style={{ color: publishDisabled ? '#8A8A84' : '#111' }}
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </AppText>
        </Pressable>
      </View>

      {/* [B] Content area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Title input */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor="#D9D9D4"
            multiline={false}
            returnKeyType="next"
            style={{
              fontSize: 22,
              fontWeight: '600',
              color: '#111',
              paddingHorizontal: 20,
              paddingVertical: 16,
            }}
          />
          <View style={{ height: 1, backgroundColor: '#D9D9D4', marginHorizontal: 20 }} />

          {/* Block list */}
          {blocks.map((block, index) => {
            if (block.type === 'text') {
              return (
                <View key={block.id}>
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[block.id] = ref;
                    }}
                    value={block.content}
                    onChangeText={(text) => updateTextBlock(block.id, text)}
                    placeholder={index === 0 ? 'Start writing...' : undefined}
                    placeholderTextColor="#D9D9D4"
                    multiline
                    style={{
                      fontSize: 16,
                      lineHeight: 26,
                      color: '#111',
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      minHeight: 52,
                      textAlignVertical: 'top',
                    }}
                  />
                  <PhotoInsertButton onPress={() => pickImageAt(index + 1)} />
                </View>
              );
            }

            if (block.type === 'image') {
              return (
                <View key={block.id}>
                  <View style={{ width: '100%', aspectRatio: 7 / 5 }}>
                    <Image
                      source={{ uri: block.localUri }}
                      contentFit="cover"
                      style={{ flex: 1 }}
                    />
                    <Pressable
                      onPress={() => removeBlock(block.id)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        borderRadius: 99,
                        width: 28,
                        height: 28,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AppText variant="caption" color="inverse">
                        ✕
                      </AppText>
                    </Pressable>
                  </View>
                  <PhotoInsertButton onPress={() => pickImageAt(index + 1)} />
                </View>
              );
            }

            return null;
          })}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* [C] Bottom toolbar */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: '#D9D9D4',
          backgroundColor: '#fff',
        }}
      >
        <Pressable
          onPress={() => pickImageAt(blocks.length)}
          style={{ alignItems: 'center', gap: 4 }}
        >
          <Feather name="image" size={20} color="#555" />
          <AppText variant="caption" style={{ color: '#8A8A84' }}>
            Photo
          </AppText>
        </Pressable>
        <View />
      </View>
    </SafeAreaView>
  );
}
