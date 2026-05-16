import api from "../api/client";
import { endpoints } from "../api/endpoints";

export const summaryService = {
  get: async (postId: number | string) => {
    const response = await api.get(endpoints.summary.get(postId));
    return response.data;
  },

  forceGenerate: async (postId: number | string) => {
    const response = await api.post(endpoints.summary.forceGenerate(postId));
    return response.data;
  },
};