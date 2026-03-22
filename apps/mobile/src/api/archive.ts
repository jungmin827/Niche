import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './client';
import { ApiError } from '../lib/error';
import { getSession } from './session';
import { presignUpload, uploadImageToStorage } from './blog';
import { ArchiveResponse } from '../features/archive/types';
import { Highlight, HighlightCreateInput } from '../features/share/types';

const HIGHLIGHT_RENDER_CACHE_KEY = 'niche.mobile.highlight-render-cache.v1';

type HighlightRenderCache = Record<string, string>;

async function readHighlightRenderCache() {
  const raw = await AsyncStorage.getItem(HIGHLIGHT_RENDER_CACHE_KEY);
  return raw ? (JSON.parse(raw) as HighlightRenderCache) : {};
}

async function writeHighlightRenderCache(cache: HighlightRenderCache) {
  await AsyncStorage.setItem(HIGHLIGHT_RENDER_CACHE_KEY, JSON.stringify(cache));
}

async function cacheHighlightRenderUri(highlightId: string, localUri: string) {
  const cache = await readHighlightRenderCache();
  cache[highlightId] = localUri;
  await writeHighlightRenderCache(cache);
}

async function hydrateHighlightImage<T extends Highlight>(highlight: T): Promise<T> {
  const cache = await readHighlightRenderCache();
  const cachedUri = cache[highlight.id];

  if (!cachedUri) {
    return highlight;
  }

  return {
    ...highlight,
    renderedImageUrl: cachedUri,
  };
}

async function hydrateHighlightList<T extends Highlight>(items: T[]) {
  const cache = await readHighlightRenderCache();

  return items.map((item) => ({
    ...item,
    renderedImageUrl: cache[item.id] ?? item.renderedImageUrl,
  }));
}

async function getMyHighlightSummary(highlightId: string) {
  const response = await getMyHighlights();
  return response.items.find((item) => item.id === highlightId) ?? null;
}

async function getHighlightWithSourceLinkage(highlightId: string) {
  const response = await getHighlight(highlightId);
  const { highlight } = response;

  if (highlight.sessionId || highlight.bundleId) {
    return {
      highlight,
      sourceLinkageRecovered: false,
    };
  }

  const summary = await getMyHighlightSummary(highlightId);

  if (!summary) {
    return {
      highlight,
      sourceLinkageRecovered: false,
    };
  }

  return {
    highlight: {
      ...summary,
      ...highlight,
      sessionId: highlight.sessionId ?? summary.sessionId,
      bundleId: highlight.bundleId ?? summary.bundleId,
    },
    sourceLinkageRecovered: true,
  };
}

export async function createHighlight(input: HighlightCreateInput) {
  // 1. 렌더된 템플릿 이미지를 Supabase Storage에 업로드
  const renderedPresign = await presignUpload('image/png', 'png', 'highlightRendered');
  await uploadImageToStorage(renderedPresign, input.renderedImagePath);

  // 2. 배경 사진이 있으면 같이 업로드
  let sourceStoragePath: string | null = null;
  if (input.sourcePhotoPath) {
    const sourcePresign = await presignUpload('image/jpeg', 'jpg', 'highlightSourcePhoto');
    await uploadImageToStorage(sourcePresign, input.sourcePhotoPath);
    sourceStoragePath = sourcePresign.path;
  }

  // 3. 로컬 URI 대신 Storage path를 백엔드에 전달
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

  // 4. 로컬 URI를 캐싱해서 오프라인/즉시 표시에 활용
  await cacheHighlightRenderUri(response.highlight.id, input.renderedImagePath);

  return {
    highlight: await hydrateHighlightImage(response.highlight),
  };
}

export async function getHighlight(highlightId: string) {
  const response = await apiRequest<{ highlight: Highlight }>(`/v1/highlights/${highlightId}`);

  return {
    highlight: await hydrateHighlightImage(response.highlight),
  };
}

export async function getMyHighlights() {
  const response = await apiRequest<{
    items: Highlight[];
    nextCursor: string | null;
    hasNext: boolean;
  }>('/v1/me/highlights');

  return {
    ...response,
    items: await hydrateHighlightList(response.items),
  };
}

export async function getMyArchive() {
  try {
    const response = await apiRequest<ArchiveResponse>('/v1/me/archive');

    return {
      ...response,
      highlights: {
        ...response.highlights,
        items: await hydrateHighlightList(response.highlights.items),
      },
    };
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'NOT_FOUND') {
      throw error;
    }

    const highlightsResponse = await getMyHighlights();

    return {
      profile: {
        id: 'me',
        handle: 'niche_user',
        displayName: 'NichE User',
        bio: '',
        avatarUrl: null,
        currentRankCode: 'surface',
        rankScore: 0,
        isPublic: true,
      },
      stats: {
        totalSessions: 0,
        totalFocusMinutes: 0,
        totalBlogPosts: 0,
        totalHighlights: highlightsResponse.items.length,
        currentStreakDays: 0,
      },
      blogPosts: {
        items: [],
        nextCursor: null,
        hasNext: false,
      },
      highlights: {
        ...highlightsResponse,
        items: await hydrateHighlightList(highlightsResponse.items),
      },
    } satisfies ArchiveResponse;
  }
}

export async function getHighlightSourceSession(highlightId: string) {
  const { highlight, sourceLinkageRecovered } = await getHighlightWithSourceLinkage(highlightId);
  if (!highlight.sessionId) {
    return {
      session: null,
      note: null,
      sourceLinkageRecovered,
      sourceLinkageMissing: true,
    };
  }

  const response = await getSession(highlight.sessionId);

  return {
    ...response,
    sourceLinkageRecovered,
    sourceLinkageMissing: false,
  };
}
