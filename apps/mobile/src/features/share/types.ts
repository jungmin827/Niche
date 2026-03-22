export type HighlightSourceType = 'session' | 'sessionBundle';
export type HighlightTemplateCode = 'mono_story_v1' | 'mono_story_v2';
export type HighlightVisibility = 'public' | 'private';

export type HighlightAuthor = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  currentRankCode: string;
};

export type Highlight = {
  id: string;
  sourceType: HighlightSourceType;
  sessionId: string | null;
  bundleId: string | null;
  title: string;
  caption: string;
  templateCode: HighlightTemplateCode;
  renderedImageUrl: string | null;
  sourcePhotoUrl: string | null;
  visibility: HighlightVisibility;
  publishedAt: string;
  author?: HighlightAuthor;
};

export type HighlightCreateInput = {
  sourceType: HighlightSourceType;
  sessionId: string | null;
  bundleId: string | null;
  title: string;
  caption: string;
  templateCode: HighlightTemplateCode;
  renderedImagePath: string;
  sourcePhotoPath: string | null;
  visibility: HighlightVisibility;
};

export type ShareModel = {
  sessionId: string;
  title: string;
  caption: string;
  templateCode: HighlightTemplateCode;
  focusLabel: string;
  dateLabel: string;
  rankLabel: string;
  noteSummary: string;
  noteInsight: string;
};
