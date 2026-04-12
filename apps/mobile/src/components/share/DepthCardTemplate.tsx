import { StyleSheet, View } from 'react-native';
import AppText from '../ui/AppText';

type Props = {
  interestName: string;
  depthScore: number | null;
  days: number;
  recordCount: number;
  recentLogText: string | null;
  handle: string;
};

export default function DepthCardTemplate({
  interestName,
  depthScore,
  days,
  recordCount,
  recentLogText,
  handle,
}: Props) {
  const years = (days / 365).toFixed(1);

  return (
    <View style={styles.card}>
      {/* Brand — top right, fixed */}
      <AppText style={styles.brand}>niche.app</AppText>

      {/* Main content block, vertically centered */}
      <View style={styles.content}>
        {/* Interest name */}
        <AppText style={styles.interestName} numberOfLines={3}>
          {interestName}
        </AppText>

        {/* Depth score */}
        {depthScore != null && (
          <View style={styles.scoreBlock}>
            <AppText style={styles.scoreValue}>{depthScore.toFixed(1)}</AppText>
            <AppText style={styles.scoreLabel}>depth score</AppText>
          </View>
        )}

        <View style={styles.divider} />

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <AppText style={styles.statValue}>{years}y</AppText>
            <AppText style={styles.statLabel}>{days} days</AppText>
          </View>
          <View style={styles.statCell}>
            <AppText style={styles.statValue}>{recordCount}</AppText>
            <AppText style={styles.statLabel}>records</AppText>
          </View>
        </View>

        {recentLogText != null && (
          <>
            <View style={styles.divider} />
            <AppText style={styles.quote} numberOfLines={4}>
              "{recentLogText}"
            </AppText>
          </>
        )}
      </View>

      {/* Handle — bottom left */}
      {handle.length > 0 && (
        <AppText style={styles.handle}>@{handle}</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 40,
  },
  brand: {
    position: 'absolute',
    top: 48,
    right: 32,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  interestName: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#FFFFFF',
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  scoreValue: {
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '900',
    letterSpacing: -2,
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
  },
  statCell: {
    gap: 2,
  },
  statValue: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
  },
  quote: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.60)',
    letterSpacing: 0.2,
  },
  handle: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.40)',
  },
});
