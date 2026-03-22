export type WaveItem = {
  highlightId: string;
  title: string;
  authorHandle: string;
  topic: string | null;
  imageUrl: string | null;
};

export type WaveFeedResponse = {
  waveItems: WaveItem[];
};
