import { formatSessionDate } from '../../lib/date';
import { SessionBundleDTO } from '../../api/session-bundle';
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
    sourceType: 'session',
    sessionId: session.id,
    bundleId: null,
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

export function buildBundleShareModel(args: {
  bundle: SessionBundleDTO;
  templateCode: HighlightTemplateCode;
  rankLabel?: string;
  streakDays?: number;
}): ShareModel {
  const { bundle, templateCode, rankLabel = 'Surface', streakDays = 0 } = args;
  const estimatedMinutes = bundle.sessionIds.length * 15;

  return {
    sourceType: 'sessionBundle',
    sessionId: null,
    bundleId: bundle.id,
    title: bundle.title,
    caption: `${bundle.sessionIds.length} sessions`,
    templateCode,
    focusLabel: `${estimatedMinutes}m of focus`,
    dateLabel: formatSessionDate(bundle.createdAt),
    rankLabel,
    noteSummary: '',
    noteInsight: '',
    quizScore: null,
    streakDays,
  };
}
