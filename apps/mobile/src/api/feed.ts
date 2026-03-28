import { WaveFeedResponse } from '../features/feed/types';
import { apiRequest } from './client';


export async function getWaveFeed(limit = 30): Promise<WaveFeedResponse> {
  return apiRequest(`/v1/feed/wave?limit=${limit}`);
}
