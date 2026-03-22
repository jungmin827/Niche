import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreateSessionInput } from './types';

const SESSION_NOTE_DRAFT_PREFIX = 'niche.mobile.session-note-draft';
export const SESSION_PRESET_MINUTES = [15, 30, 45] as const;

export function getDefaultSessionInput(): CreateSessionInput {
  return {
    topic: '',
    subject: '',
    plannedMinutes: 15,
    source: 'book',
  };
}

export function buildSessionNoteDraftKey(sessionId: string) {
  return `${SESSION_NOTE_DRAFT_PREFIX}:${sessionId}`;
}

export async function readSessionNoteDraft(sessionId: string) {
  const raw = await AsyncStorage.getItem(buildSessionNoteDraftKey(sessionId));
  return raw ? (JSON.parse(raw) as { summary: string; insight: string }) : null;
}

export async function writeSessionNoteDraft(
  sessionId: string,
  value: { summary: string; insight: string },
) {
  await AsyncStorage.setItem(buildSessionNoteDraftKey(sessionId), JSON.stringify(value));
}

export async function clearSessionNoteDraft(sessionId: string) {
  await AsyncStorage.removeItem(buildSessionNoteDraftKey(sessionId));
}
