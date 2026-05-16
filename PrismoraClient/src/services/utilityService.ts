// src/services/utilityService.ts

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { BASE_URL } from "../config/env";

const getToken = async () => {
  return await AsyncStorage.getItem("accessToken");
};

type UploadFile = {
  uri: string;
  type?: string;
  name?: string;
};

// 🔥 10 MINUTES TIMEOUT
const TIMEOUT_MS = 10 * 60 * 1000;

export const utilityService = {
  uploadVideo: async (file: UploadFile) => {
    try {
      const formData = new FormData();

      formData.append("file", {
        uri: file.uri,
        type: file.type || "video/mp4",
        name: file.name || "video.mp4",
      } as any);

      const token = await getToken();

      const res = await axios.post(
        `${BASE_URL}/utility/upload-video`,
        formData,
        {
          timeout: TIMEOUT_MS,
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            // ❌ DO NOT set Content-Type manually
          },
        }
      );

      const data = res.data;

      console.log("📦 Upload response:", data);

      return data.url; // ✅ same behavior
    } catch (error: any) {
      console.error("❌ uploadVideo error:", error);

      if (error.response) {
        throw new Error(error.response?.data?.message || "Upload failed");
      }

      if (error.code === "ECONNABORTED") {
        throw new Error("Upload timed out");
      }

      throw error;
    }
  },
};