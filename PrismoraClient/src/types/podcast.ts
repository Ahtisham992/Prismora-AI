// src/types/podcast.ts

export interface PodcastHighlight {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  duration: number; // in seconds
  
  // Podcast Info
  podcastName: string;
  episodeNumber?: string;
  
  // Creator Info
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified?: boolean;
  };
  
  // Engagement
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  views: number;
  
  // User Interaction State
  isLiked?: boolean;
  isDisliked?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CommentData {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  text: string;
  likes: number;
  createdAt: string;
  replies?: CommentData[];
}

export interface PodcastFeedResponse {
  highlights: PodcastHighlight[];
  nextPage?: string;
  hasMore: boolean;
}