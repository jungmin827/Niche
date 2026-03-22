import { StyleSheet, View } from 'react-native';
import { ShareModel } from '../../features/share/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import AppText from '../ui/AppText';

type Props = {
  model: ShareModel;
  hasBackground: boolean;
};

// Text shadow applied only when overlaid on a photo
const photoShadow = StyleSheet.create({
  text: {
    textShadowColor: colors.overlay,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: spacing.xs,
  },
}).text;

export default function NikeTemplate({ model, hasBackground }: Props) {
  const textColor = hasBackground ? colors.text.inverse : colors.text.primary;
  const labelColor = hasBackground ? 'rgba(255,255,255,0.55)' : colors.text.tertiary;
  const shadow = hasBackground ? photoShadow : undefined;

  const focusValue = String(parseInt(model.focusLabel, 10) || 0);
  const scoreValue = model.quizScore != null ? String(model.quizScore) : '—';
  const streakValue = String(model.streakDays);

  const stats: { value: string; label: string }[] = [
    { value: focusValue, label: 'focus' },
    { value: scoreValue, label: 'score' },
    { value: streakValue, label: 'streak' },
  ];

  return (
    <View style={styles.container}>
      {/* Date */}
      <AppText style={[styles.date, { color: labelColor }, shadow]}>
        {model.dateLabel}
      </AppText>

      {/* Title */}
      <AppText style={[styles.title, { color: textColor }, shadow]} numberOfLines={3}>
        {model.title}
      </AppText>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCell}>
            <AppText style={[styles.statValue, { color: textColor }, shadow]}>
              {stat.value}
            </AppText>
            <AppText style={[styles.statLabel, { color: labelColor }, shadow]}>
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    minWidth: 200,
  },
  date: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xs,
  },
  statCell: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '400',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
