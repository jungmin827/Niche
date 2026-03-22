import { View } from 'react-native';
import { formatMinutesLabel, formatSessionDate } from '../../lib/date';
import { Session } from '../../features/session/types';
import AppCard from '../ui/AppCard';
import AppText from '../ui/AppText';

type Props = {
  session: Session;
};

export default function SessionSummaryCard({ session }: Props) {
  return (
    <AppCard className="gap-4">
      <View className="gap-2">
        <AppText variant="title">{session.topic}</AppText>
        {session.subject ? (
          <AppText variant="caption" className="text-[#555555]">
            {session.subject}
          </AppText>
        ) : null}
      </View>
      <AppText variant="bodySmall" className="text-[#555555]">
        {formatSessionDate(session.startedAt)}
      </AppText>
      <AppText variant="body" className="tracking-[0.2px]">
        {session.actualMinutes ? formatMinutesLabel(session.actualMinutes) : formatMinutesLabel(session.plannedMinutes)}
      </AppText>
    </AppCard>
  );
}
