import { router } from 'expo-router';
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
import { useCreateInterestMutation } from '../../src/features/interest/hooks';
import { colors } from '../../src/theme/colors';

export default function InterestComposeModal() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateInterestMutation();

  function validateDate(value: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Use format YYYY-MM-DD';
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Invalid date';
    if (date > new Date()) return 'Date must be in the past';
    return null;
  }

  async function handleSubmit() {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    const dateError = validateDate(startedAt);
    if (dateError) {
      setError(dateError);
      return;
    }
    try {
      await createMutation.mutateAsync({ name: trimmedName, startedAt });
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
        <AppText variant="title">New Interest</AppText>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Feather name="x" size={22} color={colors.text.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name field */}
        <View style={{ gap: 8 }}>
          <AppText variant="caption" style={{ color: colors.text.tertiary }}>
            Interest
          </AppText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Natural wine"
            placeholderTextColor={colors.text.tertiary}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: colors.line.secondary,
              paddingVertical: 10,
              fontSize: 16,
              color: colors.text.primary,
            }}
            autoFocus
            returnKeyType="next"
          />
        </View>

        {/* Started at field */}
        <View style={{ gap: 8 }}>
          <AppText variant="caption" style={{ color: colors.text.tertiary }}>
            Since (YYYY-MM-DD)
          </AppText>
          <TextInput
            value={startedAt}
            onChangeText={setStartedAt}
            placeholder="e.g. 2021-03-01"
            placeholderTextColor={colors.text.tertiary}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: colors.line.secondary,
              paddingVertical: 10,
              fontSize: 16,
              color: colors.text.primary,
            }}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {error && (
          <AppText variant="caption" style={{ color: '#CC3333' }}>
            {error}
          </AppText>
        )}
      </ScrollView>

      <View style={{ padding: 20, paddingBottom: insets.bottom + 20 }}>
        <AppButton
          label="Add Interest"
          onPress={handleSubmit}
          disabled={createMutation.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
