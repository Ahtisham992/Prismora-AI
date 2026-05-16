// src/services/postsService.ts

import api from '../api/client';
import { endpoints } from '../api/endpoints';

export const postsService = {
  fetchFeed: (cursor?: number, limit = 10) =>
    api.get(endpoints.posts.feed, {
      params: { cursor, limit },
    }),

  getPostById: (id: number) => api.get(endpoints.posts.getById(id)),
  getUserPostsById: (id: number) => api.get(endpoints.posts.userPosts(id)),


  createPost: (data: any) => api.post(endpoints.posts.create, data),

  deletePost: (id: number) => api.delete(endpoints.posts.delete(id)),

  incrementViews: (id: number) => api.patch(endpoints.posts.addView(id)),

  incrementShares: (id: number) => api.patch(endpoints.posts.addShare(id)),
  getMyPosts: () => api.get(endpoints.posts.myPosts),

  getPostsByCategories: (categories: string[], limit = 10) =>
    api.get(endpoints.posts.byCategories(categories.join(','), limit)),

  getTrendingPosts: (limit = 10) => api.get(endpoints.posts.trending(limit)),

};
