import { WaveFeedResponse } from '../features/feed/types';
import { apiRequest } from './client';

const DEV_MOCK_WAVE: WaveFeedResponse = {
  waveItems: [
    { highlightId: '1', title: '하루키 문장의 속도', authorHandle: 'niche_reader', topic: '일본문학', imageUrl: null },
    { highlightId: '2', title: '공간 심리학의 이해', authorHandle: 'arch_observer', topic: null, imageUrl: null },
    { highlightId: '3', title: '비트겐슈타인과 침묵', authorHandle: 'quiet_lens', topic: '철학', imageUrl: null },
    { highlightId: '4', title: '느린 독서의 기술', authorHandle: 'slow_reader', topic: '독서법', imageUrl: null },
    { highlightId: '5', title: 'Tokyo margins', authorHandle: 'margin_notes', topic: '여행', imageUrl: null },
    { highlightId: '6', title: '고독의 지형도', authorHandle: 'solitude_map', topic: '에세이', imageUrl: null },
    { highlightId: '7', title: 'The weight of a sentence', authorHandle: 'word_scale', topic: null, imageUrl: null },
    { highlightId: '8', title: '미술관 오후 세시', authorHandle: 'gallery_three', topic: '미술', imageUrl: null },
  ],
};

export async function getWaveFeed(limit = 30): Promise<WaveFeedResponse> {
  if (__DEV__) return DEV_MOCK_WAVE;
  return apiRequest(`/v1/feed/wave?limit=${limit}`);
}
