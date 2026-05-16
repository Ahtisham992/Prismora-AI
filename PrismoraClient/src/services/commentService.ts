import api from "../api/client";
import { endpoints } from "../api/endpoints";

export const commentsService = {
  getForPost: async (postId: number | string) => {
    const response = await api.get(endpoints.comments.getForPost(postId));
    return response.data;
  },

  create: async (postId: number | string, data: { text: string }) => {
    const response = await api.post(
      endpoints.comments.create(postId),
      data
    );
    return response.data;
  },

  delete: async (commentId: number | string) => {
    const response = await api.delete(
      endpoints.comments.delete(commentId)
    );
    return response.data;
  },

  like: async (commentId: number | string) => {
    const response = await api.post(
      endpoints.comments.like(commentId)
    );
    return response.data;
  },

  unlike: async (commentId: number | string) => {
    const response = await api.delete(
      endpoints.comments.unlike(commentId)
    );
    return response.data;
  },
};