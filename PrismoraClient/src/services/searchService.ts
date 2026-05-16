import api from "../api/client";
import { endpoints } from "../api/endpoints";


export const searchService = {
  search: async (q: string) => {
    const response = await api.get(endpoints.search.search(), {
      params: { q },
    });

    return response.data;
  },
};