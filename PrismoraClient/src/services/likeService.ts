import api from "../api/client";
import { endpoints } from "../api/endpoints";

export const likesService = {
  like: async (postId: number | string) => {
    const response = await api.post(
      endpoints.likes.like(postId)
    );
    return response.data;
  },

  dislike: async (postId: number | string) => {
    const response = await api.post(
      endpoints.likes.dislike(postId)
    );
    return response.data;
  },

  remove: async (postId: number | string) => {
    const response = await api.delete(
      endpoints.likes.remove(postId)
    );
    return response.data;
  },
};