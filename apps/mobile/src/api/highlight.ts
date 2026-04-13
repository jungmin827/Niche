import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './client';
import { presignUpload, uploadImageToStorage } from './storage';
import { Highlight, HighlightCreateInput } from '../features/share/types';

const HIGHLIGHT_RENDER_CACHE_KEY = 'niche.mobile.highlight-render-cache.v1';

type HighlightRenderCache = Record<string, string>;

async function readCache(): Promise<HighlightRenderCache> {
  const raw = await AsyncStorage.getItem(HIGHLIGHT_RENDER_CACHE_KEY);
  return raw ? (JSON.parse(raw) as HighlightRenderCache) : {};
}

async function cacheRenderUri(highlightId: string, localUri: string): Promise<void> {
  const cache = await readCache();
  cache[highlightId] = localUri;
  await AsyncStorage.setItem(HIGHLIGHT_RENDER_CACHE_KEY, JSON.stringify(cache));
}

export async function createHighlight(input: HighlightCreateInput): Promise<{ highlight: Highlight }> {
  const renderedPresign = await presignUpload('image/png', 'png', 'highlightRendered');
  await uploadImageToStorage(renderedPresign, input.renderedImagePath);

  let sourceStoragePath: string | null = null;
  if (input.sourcePhotoPath) {
    const sourcePresign = await presignUpload('image/jpeg', 'jpg', 'highlightSourcePhoto');
    await uploadImageToStorage(sourcePresign, input.sourcePhotoPath);
    sourceStoragePath = sourcePresign.path;
  }

  const response = await apiRequest<{ highlight: Highlight }>('/v1/highlights', {
    method: 'POST',
    body: {
      sourceType: input.sourceType,
      sessionId: input.sessionId,
      bundleId: input.bundleId,
      title: input.title.trim(),
      caption: input.caption.trim() || null,
      templateCode: input.templateCode,
      renderedImagePath: renderedPresign.path,
      sourcePhotoPath: sourceStoragePath,
      visibility: input.visibility,
    },
  });

  await cacheRenderUri(response.highlight.id, input.renderedImagePath);
  return response;
}
