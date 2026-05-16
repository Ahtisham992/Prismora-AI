import api from "../api/client";
import { endpoints } from "../api/endpoints";

export const notificationsService = {
  // -----------------------------------------------------------
  // 🔔 GET ALL NOTIFICATIONS
  // -----------------------------------------------------------
  getAll: async () => {
    const response = await api.get(
      endpoints.notifications.getAll
    );
    return response.data;
  },

  // -----------------------------------------------------------
  // ✅ MARK SINGLE AS READ
  // -----------------------------------------------------------
  markAsRead: async (id: number | string) => {
    const response = await api.patch(
      endpoints.notifications.markAsRead(id)
    );
    return response.data;
  },

  // -----------------------------------------------------------
  // ✅ MARK ALL AS READ
  // -----------------------------------------------------------
  markAllAsRead: async () => {
    const response = await api.patch(
      endpoints.notifications.markAllAsRead
    );
    return response.data;
  },
};