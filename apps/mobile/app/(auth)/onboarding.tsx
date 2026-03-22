import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../src/components/ui/AppButton';
import AppText from '../../src/components/ui/AppText';
import { useUpdateProfileMutation } from '../../src/features/archive/mutations';
import { getMyProfile } from '../../src/api/profile';

export const INTEREST_TAGS: string[] = [
  'Reading', 'Film', 'Music', 'Photography', 'Writing',
  'Art', 'Architecture', 'Fashion', 'Design', 'Philosophy',
  'Food', 'Travel', 'Technology', 'Craft', 'Nature',
];

export default function OnboardingScreen(): React.JSX.Element {
  const [displayName, setDisplayName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const updateProfile = useUpdateProfileMutation();

  const isValid = displayName.trim().length > 0;

  useEffect(() => {
    getMyProfile().then(({ profile }) => {
      if (profile.onboardingCompleted) {
        router.replace('/(tabs)/session');
      }
    }).catch(() => {
      // ignore — let user complete onboarding
    });
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleStart = async () => {
    if (!isValid || updateProfile.isPending) return;
    await updateProfile.mutateAsync({
      displayName: displayName.trim(),
      onboardingCompleted: true,
    });
    if (selectedTags.length > 0) {
      await AsyncStorage.setItem('niche:interests', JSON.stringify(selectedTags));
    }
    router.replace('/(tabs)/session');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <AppText variant="title" style={styles.title}>
              What do you go deep on?
            </AppText>
            <AppText variant="bodySmall" style={styles.subtitle}>
              Set your name and pick what pulls you in.
            </AppText>
          </View>

          {/* Display name section */}
          <View style={styles.section}>
            <AppText variant="caption" style={styles.label}>
              Display name
            </AppText>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={30}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              placeholder="Your name"
              placeholderTextColor="#C0C0BB"
            />
          </View>

          {/* Interests section */}
          <View style={styles.section}>
            <AppText variant="caption" style={styles.label}>
              Interests
            </AppText>
            <View style={styles.tagsWrap}>
              {INTEREST_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
                  >
                    <AppText
                      variant="caption"
                      style={selected ? styles.chipTextSelected : styles.chipTextUnselected}
                    >
                      {tag}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.footer}>
          <AppButton
            label="Get started"
            disabled={!isValid || updateProfile.isPending}
            onPress={handleStart}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    color: '#111',
    marginBottom: 8,
  },
  subtitle: {
    color: '#8A8A84',
  },
  section: {
    marginBottom: 32,
  },
  label: {
    color: '#8A8A84',
    marginBottom: 10,
  },
  input: {
    fontSize: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D9D9D4',
    color: '#111',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 999,
  },
  chipUnselected: {
    borderColor: '#D9D9D4',
    backgroundColor: '#fff',
  },
  chipSelected: {
    borderColor: '#111',
    backgroundColor: '#111',
  },
  chipTextUnselected: {
    color: '#555',
  },
  chipTextSelected: {
    color: '#fff',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    paddingTop: 12,
    backgroundColor: '#fff',
  },
});
