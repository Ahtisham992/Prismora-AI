// src/config/env.ts
import { ENVIRONMENT, API_BASE_URL_DEV, API_BASE_URL_PROD } from "@env";
import { Platform } from "react-native";

export const CURRENT_ENV = ENVIRONMENT || "production";

function resolveDevBaseUrl() {
  // If Android → replace localhost with 10.0.2.2
  if (Platform.OS === "android") {
    return API_BASE_URL_DEV.replace("localhost", "10.0.2.2");
  }
  return API_BASE_URL_DEV;
}

export const BASE_URL =
  CURRENT_ENV === "production"
    ? API_BASE_URL_PROD
    : resolveDevBaseUrl();

// Debug log
console.log("🌐 BASE_URL =", BASE_URL);
