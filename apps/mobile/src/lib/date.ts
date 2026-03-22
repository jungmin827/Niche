export function formatMinutesLabel(minutes: number) {
  return `${minutes}분`;
}

export function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function minutesBetween(startedAt: string, endedAt: string) {
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();

  return Math.max(1, Math.round(diffMs / 60000));
}

export function formatSessionDate(isoString: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoString));
}
