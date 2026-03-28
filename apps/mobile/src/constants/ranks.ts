export type RankTier = {
  code: string;
  title: string;
  minScore: number;
};

export const RANK_TIERS: RankTier[] = [
  { code: 'eveil',      title: 'Surface',   minScore: 0 },
  { code: 'seuil',      title: 'Trace',     minScore: 15 },
  { code: 'fond',       title: 'Focus',     minScore: 40 },
  { code: 'strate',     title: 'Depth',     minScore: 80 },
  { code: 'distillat',  title: 'Frame',     minScore: 150 },
  { code: 'trame',      title: 'Tone',      minScore: 250 },
  { code: 'empreinte',  title: 'Shape',     minScore: 400 },
  { code: 'corpus',     title: 'Archive',   minScore: 600 },
  { code: 'paraphe',    title: 'Signature', minScore: 850 },
  { code: 'canon',      title: 'Canon',     minScore: 1200 },
];

export function getRankByCode(code: string): RankTier {
  return RANK_TIERS.find((r) => r.code === code) ?? RANK_TIERS[0];
}

/** 현재 점수 기준으로 다음 랭크까지의 진행도 (0–1). 최고 랭크면 1 반환. */
export function getRankProgress(rankScore: number, rankCode: string): number {
  const currentIndex = RANK_TIERS.findIndex((r) => r.code === rankCode);
  if (currentIndex === -1 || currentIndex === RANK_TIERS.length - 1) return 1;
  const current = RANK_TIERS[currentIndex];
  const next = RANK_TIERS[currentIndex + 1];
  const range = next.minScore - current.minScore;
  const earned = rankScore - current.minScore;
  return Math.min(Math.max(earned / range, 0), 1);
}

export function getNextRank(rankCode: string): RankTier | null {
  const currentIndex = RANK_TIERS.findIndex((r) => r.code === rankCode);
  if (currentIndex === -1 || currentIndex === RANK_TIERS.length - 1) return null;
  return RANK_TIERS[currentIndex + 1];
}
