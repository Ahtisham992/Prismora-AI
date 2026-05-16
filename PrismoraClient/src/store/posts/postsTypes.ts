// src/store/posts/postTypes.ts

export interface FeedCreator {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string | null;
}

export interface FeedPost {
  id: number;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description?: string | null;
  duration: number;
  podcastName?: string | null;
  episodeNumber?: string | null;

  likes: number;
  dislikes: number;
  commentsCount: number;
  shares: number;
  views: number;

  creator: FeedCreator;

  // Client UI states (not from backend)
  isLiked?: boolean;
  isDisliked?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface FeedResponse {
  posts: FeedPost[];
  nextCursor: number | null;
}

export interface PostSlice {
  posts: FeedPost[];
  nextCursor: number | null;
  isLoading: boolean;

  fetchFeed: (reset?: boolean) => Promise<void>;
  refreshFeed: () => Promise<void>;
}
