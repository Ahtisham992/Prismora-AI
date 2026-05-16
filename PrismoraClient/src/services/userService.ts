// src/services/userService.ts
import api from "../api/client";
import { endpoints } from "../api/endpoints";

export const userService = {
  // -----------------------------
  // Profile
  // -----------------------------
  getMe: () => api.get(endpoints.user.me),

  getUserById: (id: number | string) =>
    api.get(endpoints.user.getById(id)),

  updateProfile: (data: any) =>
    api.patch(endpoints.user.update, data),

  updateUsername: (username: string) =>
    api.patch(endpoints.user.updateUsername, { username }),

  updatePhoto: (profilePhoto: string) =>
    api.patch(endpoints.user.updatePhoto, { profilePhoto }),

  // -----------------------------
  // User Stats
  // -----------------------------
  getUserStats: () =>
    api.get(endpoints.user.stats()),

  getUserStatsById: (id: number | string) =>
  api.get(endpoints.user.statsById(id)),

   getSuggestedUsers: () =>
    api.get(endpoints.user.suggestedUser()),

  // -----------------------------
  // Follow System
  // -----------------------------
  followUser: (id: number | string) =>
    api.post(endpoints.user.follow(id)),

  unfollowUser: (id: number | string) =>
    api.delete(endpoints.user.unfollow(id)),

  getFollowers: (id: number | string) =>
    api.get(endpoints.user.followers(id)),

  getFollowing: (id: number | string) =>
    api.get(endpoints.user.following(id)),

  getIsFollowing: (id: number | string) =>
    api.get(endpoints.user.isfollowing(id)),

  // -----------------------------
// Connections (NEW)
// -----------------------------
getMyConnections: () =>
  api.get(endpoints.user.myConnections()),

getUserConnections: (id: number | string) =>
  api.get(endpoints.user.connections(id)),
};