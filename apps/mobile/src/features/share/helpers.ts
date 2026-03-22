import { formatSessionDate } from '../../lib/date';
import { Session, SessionNote } from '../session/types';
import { HighlightTemplateCode, ShareModel } from './types';

export function buildHighlightTitle(session: Session) {
  return session.topic;
}

export function buildHighlightCaption(note: SessionNote | null) {
  return note?.insight?.trim() || note?.summary?.trim() || '남겨둔 장면';
}

export function buildShareModel(args: {
  session: Session;
  note: SessionNote | null;
  templateCode: HighlightTemplateCode;
  rankLabel?: string;
  quizScore?: number | null;
  streakDays?: number;
}): ShareModel {
  const { session, note, templateCode, rankLabel = 'Surface', quizScore = null, streakDays = 0 } = args;

  return {
    sessionId: session.id,
    title: buildHighlightTitle(session),
    caption: buildHighlightCaption(note),
    templateCode,
    focusLabel: `${session.actualMinutes ?? session.plannedMinutes}m of focus`,
    dateLabel: formatSessionDate(session.startedAt),
    rankLabel,
    noteSummary: note?.summary ?? '',
    noteInsight: note?.insight ?? '',
    quizScore,
    streakDays,
  };
}
