import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../src/components/ui/AppText';
import { useUpdateProfileMutation } from '../../src/features/archive/mutations';

export default function ProfileEditScreen() {
  const { displayName: initialName } = useLocalSearchParams<{ displayName: string }>();
  const [displayName, setDisplayName] = useState(initialName ?? '');
  const updateProfile = useUpdateProfileMutation();

  const isUnchanged = displayName.trim() === (initialName ?? '').trim();
  const isDisabled = displayName.trim().length === 0 || isUnchanged || updateProfile.isPending;

  const handleSave = async () => {
    if (isDisabled) return;
    await updateProfile.mutateAsync({ displayName: displayName.trim() });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      {/* Header */}
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
          Edit Profile
        </AppText>
        <Pressable onPress={handleSave} disabled={isDisabled} hitSlop={8}>
          <AppText
            variant="bodySmall"
            style={{ color: isDisabled ? '#8A8A84' : '#111' }}
          >
            {updateProfile.isPending ? 'Saving...' : 'Save'}
          </AppText>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ padding: 24, gap: 8 }}>
          <AppText variant="caption" style={{ color: '#8A8A84' }}>
            Display name
          </AppText>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
            style={{
              fontSize: 16,
              color: '#111',
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#D9D9D4',
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
