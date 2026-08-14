export interface ArticleAuthor {
  _id: string;
  pseudo: string;
}

export interface Article {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  status?: 'draft' | 'published';
  imageUrl?: string;

  author?: ArticleAuthor | string;

  likes?: number;
  likedBy: string[];
  views?: number;

  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export {};