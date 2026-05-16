// src/services/authService.ts
import api from "../api/client";
import { endpoints } from "../api/endpoints";

export const authService = {
  register: (data: any) => api.post(endpoints.auth.register, data),
  login: (data: any) => api.post(endpoints.auth.login, data),
  googleLogin: (googleToken: string) =>
    api.post(endpoints.auth.googleMobile, { googleToken }),
};
