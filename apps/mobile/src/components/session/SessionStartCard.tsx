import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../ui/AppText';

type Props = {
  streakDays?: number;
  rankLabel?: string;
  todayFocusMinutes?: number;
  hasActiveSession?: boolean;
  isSubmitting?: boolean;
  onSubmit: (input: {
    topic: string;
    subject: string;
    plannedMinutes: number;
    plannedSessionCount: number;
  }) => void;
  onResumeSession?: () => void;
};

export default function SessionStartCard({
  streakDays = 0,
  rankLabel = 'Surface',
  todayFocusMinutes = 0,
  hasActiveSession = false,
  isSubmitting = false,
  onSubmit,
  onResumeSession,
}: Props) {
  const ALLOWED_MINUTES = [15, 30, 45, 60] as const;
  const [topic, setTopic] = useState('');
  const [minutesIndex, setMinutesIndex] = useState(0); // index into ALLOWED_MINUTES
  const plannedMinutes = ALLOWED_MINUTES[minutesIndex];
  const [plannedSessionCount, setPlannedSessionCount] = useState(1);

  const canPlay = hasActiveSession || (!isSubmitting && topic.trim().length > 0);

  const handlePlay = () => {
    if (hasActiveSession) {
      onResumeSession?.();
      return;
    }
    if (!canPlay) return;
    onSubmit({ topic, subject: '', plannedMinutes, plannedSessionCount });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Stats bar */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 32,
            paddingTop: 16,
            paddingBottom: 8,
          }}
        >
          <View>
            <AppText
              variant="caption"
              color="inverse"
              style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginBottom: 2 }}
            >
              오늘의 누적
            </AppText>
            <AppText variant="title" color="inverse" style={{ color: '#fff' }}>
              {todayFocusMinutes}분
            </AppText>
          </View>
          <View style={{ alignItems: 'center' }}>
            <AppText
              variant="caption"
              color="inverse"
              style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginBottom: 2 }}
            >
              랭크
            </AppText>
            <AppText variant="title" color="inverse" style={{ color: '#fff' }}>
              {rankLabel}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText
              variant="caption"
              color="inverse"
              style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginBottom: 2 }}
            >
              streak
            </AppText>
            <AppText variant="title" color="inverse" style={{ color: '#fff' }}>
              {streakDays > 0 ? `${streakDays}일` : '—'}
            </AppText>
          </View>
        </View>

        {/* Center form */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
            gap: 40,
          }}
        >
          {/* Topic input */}
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder={hasActiveSession ? '진행 중인 세션이 있습니다.' : 'What is your topic today?'}
            placeholderTextColor="rgba(255,255,255,0.35)"
            editable={!hasActiveSession}
            style={{
              width: '100%',
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.25)',
              paddingBottom: 12,
              color: '#fff',
              fontSize: 18,
              textAlign: 'center',
              fontWeight: '300',
            }}
          />

          {/* Time + Sessions steppers */}
          <View style={{ width: '100%', gap: 20 }}>
            {/* Time */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText
                variant="bodySmall"
                color="inverse"
                style={{ color: 'rgba(255,255,255,0.65)' }}
              >
                Time
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Pressable
                  onPress={() => setMinutesIndex((i) => Math.max(0, i - 1))}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText color="inverse" style={{ color: '#fff', fontSize: 18, lineHeight: 22 }}>
                    −
                  </AppText>
                </Pressable>
                <AppText
                  color="inverse"
                  style={{ color: '#fff', minWidth: 80, textAlign: 'center', fontSize: 14 }}
                >
                  {plannedMinutes} mins
                </AppText>
                <Pressable
                  onPress={() => setMinutesIndex((i) => Math.min(ALLOWED_MINUTES.length - 1, i + 1))}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText color="inverse" style={{ color: '#fff', fontSize: 18, lineHeight: 22 }}>
                    +
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />

            {/* Sessions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText
                variant="bodySmall"
                color="inverse"
                style={{ color: 'rgba(255,255,255,0.65)' }}
              >
                Sessions
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Pressable
                  onPress={() => setPlannedSessionCount((s) => Math.max(1, s - 1))}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText color="inverse" style={{ color: '#fff', fontSize: 18, lineHeight: 22 }}>
                    −
                  </AppText>
                </Pressable>
                <AppText
                  color="inverse"
                  style={{ color: '#fff', minWidth: 80, textAlign: 'center', fontSize: 14 }}
                >
                  {plannedSessionCount} {plannedSessionCount === 1 ? 'Session' : 'Sessions'}
                </AppText>
                <Pressable
                  onPress={() => setPlannedSessionCount((s) => s + 1)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText color="inverse" style={{ color: '#fff', fontSize: 18, lineHeight: 22 }}>
                    +
                  </AppText>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom play button */}
        <View style={{ alignItems: 'center', paddingBottom: 64, gap: 16 }}>
          <Pressable
            onPress={handlePlay}
            disabled={!canPlay}
            style={({ pressed }) => ({
              width: 96,
              height: 96,
              borderRadius: 48,
              borderWidth: 2,
              borderColor: canPlay ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {/* Play triangle */}
            <View
              style={{
                width: 0,
                height: 0,
                borderTopWidth: 13,
                borderBottomWidth: 13,
                borderLeftWidth: 20,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: canPlay ? '#fff' : 'rgba(255,255,255,0.2)',
                marginLeft: 4,
              }}
            />
          </Pressable>
          <AppText
            variant="bodySmall"
            color="inverse"
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}
          >
            {hasActiveSession ? 'Resume session' : 'Ready to begin?'}
          </AppText>
        </View>
      </View>
    </SafeAreaView>
  );
}
