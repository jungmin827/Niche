export type FeedAuthor = {
  id: string;
  handle: string;
  displayName: string;
};

export type FeedPost = {
  id: string;
  author: FeedAuthor;
  content: string;
  createdAt: string;
  expiresAt: string;
  commentCount: number;
};

export type FeedComment = {
  id: string;
  author: FeedAuthor;
  content: string;
  createdAt: string;
};
