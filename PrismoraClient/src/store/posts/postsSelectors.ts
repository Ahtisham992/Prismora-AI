// src/store/posts/postSelectors.ts

import { RootState } from "../index";

export const selectPosts = (state: RootState) => state.posts;
export const selectNextCursor = (state: RootState) => state.nextCursor;
export const selectPostLoading = (state: RootState) => state.isLoading;

export const selectPostById = (id: number) => (state: RootState) =>
  state.posts.find((p) => p.id === id);
