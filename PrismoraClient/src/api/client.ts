// src/api/client.ts

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config/env";

console.log("🔧 API BASE_URL =", BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300000,
   headers: {
    Connection: "keep-alive",
  },
});

// ---------------------------
// REQUEST LOGGER
// ---------------------------
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");

    console.log("📡 API REQUEST →", {
      url: `${config.baseURL}${config.url}`,
      method: config.method,
      headers: {
        ...config.headers,
        Authorization: token ? `Bearer ${token}` : undefined,
      },
      data: config.data,
    });

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.log("❌ API REQUEST ERROR →", error);
    return Promise.reject(error);
  }
);

// ---------------------------
// RESPONSE LOGGER
// ---------------------------
api.interceptors.response.use(
  (response) => {
    console.log("📥 API RESPONSE ←", {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.log("❌ API RESPONSE ERROR ←", {
      url: error.config?.url,
      message: error.message,
      response: error.response
        ? {
            status: error.response.status,
            data: error.response.data,
          }
        : null,
    });
    return Promise.reject(error);
  }
);

export default api;
