import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../../components/ui/AppButton';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { colors } from '../../../theme/colors';
import { useSessionDetailQuery } from '../../session/hooks';

const ENTER_DURATION = 280;
const ENTER_EASING = Easing.out(Easing.cubic);

interface Props {
  sessionId: string;
}

function formatDate(isoString: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(isoString),
  );
}

export default function HighlightCreateScreen({ sessionId }: Props) {
  const detailQuery = useSessionDetailQuery(sessionId);
  const session = detailQuery.data?.session ?? null;

  function handlePreview() {
    router.push(routes.sharePreviewModal({ sessionId }));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.line.secondary,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <AppText variant="bodySmall">Cancel</AppText>
        </Pressable>
        <AppText variant="caption" style={{ color: colors.text.tertiary }}>
          New Highlight
        </AppText>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Session info */}
        <Animated.View
          entering={FadeInDown.duration(ENTER_DURATION).easing(ENTER_EASING)}
          style={{
            paddingTop: 32,
            paddingBottom: 24,
            borderBottomWidth: 1,
            borderBottomColor: colors.line.secondary,
          }}
        >
          <AppText
            variant="caption"
            style={{ color: colors.text.tertiary, marginBottom: 8, letterSpacing: 0.5 }}
          >
            Session
          </AppText>
          {detailQuery.isLoading ? (
            <AppText variant="bodySmall" style={{ color: colors.text.tertiary }}>
              Loading...
            </AppText>
          ) : session ? (
            <>
              <AppText variant="title">{session.topic}</AppText>
              <AppText variant="caption" style={{ color: colors.text.tertiary, marginTop: 6 }}>
                {session.actualMinutes ?? session.plannedMinutes} min
                {session.endedAt ? `  ·  ${formatDate(session.endedAt)}` : ''}
              </AppText>
            </>
          ) : (
            <AppText variant="bodySmall" style={{ color: colors.text.tertiary }}>
              Session not found.
            </AppText>
          )}
        </Animated.View>

        {/* Template selection */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(ENTER_DURATION).easing(ENTER_EASING)}
          style={{
            paddingTop: 24,
            paddingBottom: 24,
            borderBottomWidth: 1,
            borderBottomColor: colors.line.secondary,
          }}
        >
          <AppText
            variant="caption"
            style={{ color: colors.text.tertiary, marginBottom: 16, letterSpacing: 0.5 }}
          >
            Template
          </AppText>

          {/* Single template card — selected */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: colors.line.primary,
            }}
          >
            <View style={{ gap: 3 }}>
              <AppText variant="bodySmall" style={{ fontWeight: '500' }}>
                NichE
              </AppText>
              <AppText variant="caption" style={{ color: colors.text.tertiary }}>
                Minimal editorial card
              </AppText>
            </View>
            <Feather name="check" size={16} color={colors.text.primary} />
          </View>
        </Animated.View>
      </View>

      {/* Bottom CTA */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(ENTER_DURATION).easing(ENTER_EASING)}
        style={{ paddingHorizontal: 20, paddingBottom: 8 }}
      >
        <AppButton
          label="Preview"
          onPress={handlePreview}
          disabled={!session || detailQuery.isLoading}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
