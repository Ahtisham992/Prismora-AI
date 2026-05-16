// src/store/posts/postsSlice.ts

import { StateCreator } from "zustand";
import { postsService } from "../../services/postsService";
import { PostSlice } from "./postsTypes";

export const createPostSlice: StateCreator<PostSlice> = (set, get) => ({
  posts: [],
  nextCursor: null,
  isLoading: false,

  fetchFeed: async () => {
    set({ isLoading: true });

    try {
      const res = await postsService.fetchFeed(undefined, 10);
      const { data, nextCursor } = res.data;

      const mapped = data.map((p: any) => ({
        id: p.id.toString(),
        videoUrl: p.videoUrl,
        thumbnailUrl: p.thumbnailUrl,
        title: p.title,
        description: p.description,
        duration: p.duration,
        podcastName: p.podcastName,
        episodeNumber: p.episodeNumber,

        likes: p.likes,
        dislikes: p.dislikes,
        comments: p.commentsCount,
        shares: p.shares,
        views: p.views,

        // UI interaction defaults
        isLiked: false,
        isDisliked: false,
        isBookmarked: false,
        isFollowing: false,

        creator: {
          id: p.creator.id,
          username: p.creator.username,
          displayName: p.creator.username,
          avatarUrl: p.creator.profilePhoto,
          isVerified: true,
        },
      }));

      set({
        posts: mapped,
        nextCursor: nextCursor ?? null,
        isLoading: false,
      });
    } catch (error) {
      console.log("Feed fetch error:", error);
      set({ isLoading: false });
    }
  },

  // optional: refresh
  refreshFeed: async () => {
    await get().fetchFeed();
  },
});
