// src/api/endpoints.ts

export const endpoints = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    googleMobile: '/auth/google/mobile',
  },

  user: {
    me: '/user/me',
    update: '/user/update',
    updateUsername: '/user/username',
    updatePhoto: '/user/photo',
    suggestedUser: () => '/user/suggested',
    stats: () => `/user/stats`,
    statsById: (id: number | string) => `/user/stats/${id}`,
    getById: (id: number | string) => `/user/${id}`,
    followers: (id: number | string) => `/user/${id}/followers`,
    following: (id: number | string) => `/user/${id}/following`,
    follow: (id: number | string) => `/user/follow/${id}`,
    unfollow: (id: number | string) => `/user/follow/${id}`,
    isfollowing: (id: number | string) => `/user/is-following/${id}`,
    connections: (id: number | string) => `/user/${id}/connections`,
    myConnections: () => `/user/connections`,
  },

  posts: {
    feed: '/posts/feed',
    getById: (id: number | string) => `/posts/${id}`,
    create: '/posts',
    delete: (id: number | string) => `/posts/${id}`,
    addView: (id: number | string) => `/posts/${id}/views`,
    addShare: (id: number | string) => `/posts/${id}/share`,
    userPosts: (id: number | string) => `/posts/user/${id}`,
    myPosts: '/posts/my-posts',
    byCategories: (categories: string, limit?: number) =>
      `/posts/categories?categories=${encodeURIComponent(categories)}${
        limit ? `&limit=${limit}` : ''
      }`,
    trending: (limit?: number) =>
      `/posts/trending${limit ? `?limit=${limit}` : ''}`,
  },
  comments: {
    getForPost: (postId: number | string) => `/comments/${postId}`,
    create: (postId: number | string) => `/comments/${postId}`,
    delete: (commentId: number | string) => `/comments/delete/${commentId}`,
    like: (commentId: number | string) => `/comments/${commentId}/like`,
    unlike: (commentId: number | string) => `/comments/${commentId}/like`,
  },
  follow: {
    followUser: (userId: number | string) => `/follow/${userId}`,
    unfollowUser: (userId: number | string) => `/follow/${userId}`,
    myFollowers: `/follow/me/followers`,
    myFollowing: `/follow/me/following`,
  },
  likes: {
    like: (postId: number | string) => `/likes/${postId}/like`,
    dislike: (postId: number | string) => `/likes/${postId}/dislike`,
    remove: (postId: number | string) => `/likes/${postId}`,
  },
  bookmarks: {
    add: (postId: number | string) => `/bookmarks/${postId}`,
    remove: (postId: number | string) => `/bookmarks/${postId}`,
    myBookmarks: '/bookmarks/me',
  },
  report: {
    create: (postId: number | string) => `/report/${postId}`,
    getAll: '/report', // admin-only
  },
  summary: {
    get: (postId: number | string) => `/summary/${postId}`,
    forceGenerate: (postId: number | string) => `/summary/${postId}`,
  },
  ai: {
    health: '/ai/health',
    extractInfo: '/ai/extract-info',
    validatePodcast: '/ai/validate-podcast',   // Content validation filter
    transcribe: '/ai/transcribe',
    summarize: '/ai/summarize',
    highlight: '/ai/highlight-generate',
    fuse: '/ai/fuse-clips',
  },

  search: { search: () => `/search` },
  utility: { uploadVideo: () => '/utility/upload-video' },
  notifications: {
    getAll: '/notifications', // GET user notifications
    markAsRead: (id: number | string) => `/notifications/${id}/read`, // PATCH single notification
    markAllAsRead: '/notifications/read/all', // PATCH all notifications
  },
};
