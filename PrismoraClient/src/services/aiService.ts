// src/services/aiService.ts

import api from '../api/client';
import { endpoints } from '../api/endpoints';

export const aiService = {
  // ---------------------------------------
  // 1. Health Check
  // ---------------------------------------
  health() {
    return api.get(endpoints.ai.health);
  },

  // ---------------------------------------
  // 2. Extract Video Info (thumbnail, title, tags)
  // ---------------------------------------
  extractInfo(payload: { youtube_url: string }) {
    return api.post(endpoints.ai.extractInfo, payload);
  },

  // ---------------------------------------
  // 3. Validate Podcast (content filter — runs BEFORE extractInfo)
  // ---------------------------------------
  validatePodcast(payload: { youtube_url: string }) {
    return api.post(endpoints.ai.validatePodcast, payload, { timeout: 35_000 });
  },

  // ---------------------------------------
  // 3. Transcription
  // ---------------------------------------
  transcribe(
    payload: { youtube_url: string; include_timestamps: boolean },
    timeout = 0,
  ) {
    return api.post(endpoints.ai.transcribe, payload, { timeout });
  },

  // ---------------------------------------
  // 4. Summarization
  // ---------------------------------------
  summarize(
    payload: {
      text: string;
      segments: { start: number; end: number; text: string }[];
      duration_seconds: number;
    },
    timeout = 0,
  ) {
    return api.post(endpoints.ai.summarize, payload, { timeout });
  },

  // ---------------------------------------
  // 5. Highlight Generation
  // ---------------------------------------
  generateHighlight(
    payload: {
      youtube_url: string;
      segments: { start: number; end: number; text: string }[];
      duration: string;
      suggestion: string;
    },
    timeout = 0,
  ) {
    return api.post(endpoints.ai.highlight, payload, { timeout });
  },

  // ---------------------------------------
  // 6. Fuse Clips
  // ---------------------------------------
  fuseClips(
    payload: {
      clip_urls: string[];
      transition: string;
    },
    timeout = 0,
  ) {
    return api.post(endpoints.ai.fuse, payload, { timeout });
  },
};
