import { BlogPostListItem } from '../blog/types';
import { Highlight } from '../share/types';

export type ArchiveProfile = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  currentRankCode: string;
  rankScore: number;
  isPublic: boolean;
};

export type ArchiveStats = {
  totalSessions: number;
  totalFocusMinutes: number;
  totalBlogPosts: number;
  totalHighlights: number;
  currentStreakDays: number;
};

export type ArchiveResponse = {
  profile: ArchiveProfile;
  stats: ArchiveStats;
  blogPosts: {
    items: BlogPostListItem[];
    nextCursor: string | null;
    hasNext: boolean;
  };
  highlights: {
    items: Highlight[];
    nextCursor: string | null;
    hasNext: boolean;
  };
};
