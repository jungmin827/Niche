export type TextBlock = {
  id: string;
  type: 'text';
  content: string;
};

export type ImageBlock = {
  id: string;
  type: 'image';
  localUri: string;
  storagePath?: string;
  width?: number;
  height?: number;
};

export type Block = TextBlock | ImageBlock;

export type BlogPost = {
  id: string;
  title: string;
  excerpt: string | null;
  bodyMd: string;
  coverImageUrl: string | null;
  visibility: 'public' | 'private';
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogPostListItem = {
  id: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  visibility: 'public' | 'private';
  publishedAt: string;
};

export type ComposeState = {
  title: string;
  blocks: Block[];
};
