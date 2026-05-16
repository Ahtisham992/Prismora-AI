/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// src/modules/ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  private readonly FASTAPI_URL =
    'http://localhost:8000/api/v1';

  constructor(private readonly http: HttpService) { }

  // ------------------------------ HEALTH ------------------------------
  async health() {
    const res = await firstValueFrom(
      this.http.get(`${this.FASTAPI_URL}/health`),
    );
    return res.data;
  }
  // ------------------------------ EXTRACT INFO ------------------------------
  async extract_info(body: any) {
    const res = await firstValueFrom(
      this.http.post(`${this.FASTAPI_URL}/extract-info`, body, {
        timeout: 0, // disables timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }),
    );

    return res.data;
  }

  // ------------------------------ VALIDATE PODCAST ------------------------------
  async validate_podcast(body: { youtube_url: string }) {
    const res = await firstValueFrom(
      this.http.post(`${this.FASTAPI_URL}/validate-podcast/`, body, {
        timeout: 35_000, // 30 s sample + buffer
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }),
    );
    return res.data;
  }


  async transcribe(body: any) {
    const res = await firstValueFrom(
      this.http.post(`${this.FASTAPI_URL}/transcribe`, body, {
        timeout: 0, // disables timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }),
    );

    return res.data;
  }

  // ------------------------------ SUMMARIZE ------------------------------
  async summarize(body: any) {
    const res = await firstValueFrom(
      this.http.post(`${this.FASTAPI_URL}/summarize`, body, {
        timeout: 0, // disables timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }),
    );
    return res.data;
  }

  // ------------------------------ HIGHLIGHT GENERATION ------------------------------
  async generateHighlight(body: any) {
    const res = await firstValueFrom(
      this.http.post(`${this.FASTAPI_URL}/highlight-generate`, body, {
        timeout: 0, // disables timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }),
    );
    return res.data;
  }

  // ------------------------------ FUSE CLIPS ------------------------------
  async fuseClips(body: any) {
    const res = await firstValueFrom(
      this.http.post(`${this.FASTAPI_URL}/fuse-clips`, body, {
        timeout: 0, // disables timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }),
    );
    return res.data;
  }
}
