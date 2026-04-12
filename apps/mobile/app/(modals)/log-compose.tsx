import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AppButton from '../../src/components/ui/AppButton';
import AppText from '../../src/components/ui/AppText';
import { useCreateLogMutation } from '../../src/features/interest/hooks';
import { LOG_TAGS, LOG_TAG_LABELS, LogTag } from '../../src/features/interest/types';
import { colors } from '../../src/theme/colors';

export default function LogComposeModal() {
  const insets = useSafeAreaInsets();
  const { interestId } = useLocalSearchParams<{ interestId: string }>();
  const [text, setText] = useState('');
  const [tag, setTag] = useState<LogTag>('other');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateLogMutation(interestId ?? '');

  async function handleSubmit() {
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Record text is required');
      return;
    }
    if (trimmed.length > 2000) {
      setError('Text must be 2000 characters or fewer');
      return;
    }
    try {
      await createMutation.mutateAsync({ text: trimmed, tag });
      router.back();
    } catch {
      setError('Something went wrong. Try again.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: colors.line.secondary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <AppText variant="title">New Record</AppText>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Feather name="x" size={22} color={colors.text.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tag picker */}
        <View style={{ gap: 8 }}>
          <AppText variant="caption" style={{ color: colors.text.tertiary }}>
            Type
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LOG_TAGS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTag(t)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  borderWidth: 1,
                  borderColor: tag === t ? colors.line.primary : colors.line.secondary,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  backgroundColor: tag === t ? colors.surface.inverse : colors.bg.primary,
                })}
                accessibilityRole="button"
                accessibilityState={{ selected: tag === t }}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: tag === t ? colors.text.inverse : colors.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  }}
                >
                  {LOG_TAG_LABELS[t]}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Text field */}
        <View style={{ gap: 8 }}>
          <AppText variant="caption" style={{ color: colors.text.tertiary }}>
            Record
          </AppText>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write your observation, note, or reflection..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={6}
            style={{
              borderWidth: 1,
              borderColor: colors.line.secondary,
              padding: 12,
              fontSize: 16,
              color: colors.text.primary,
              minHeight: 140,
              textAlignVertical: 'top',
            }}
            autoFocus
          />
          <AppText variant="caption" style={{ color: colors.text.tertiary, textAlign: 'right' }}>
            {text.length} / 2000
          </AppText>
        </View>

        {error && (
          <AppText variant="caption" style={{ color: '#CC3333' }}>
            {error}
          </AppText>
        )}
      </ScrollView>

      <View style={{ padding: 20, paddingBottom: insets.bottom + 20 }}>
        <AppButton
          label="Save Record"
          onPress={handleSubmit}
          disabled={createMutation.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
