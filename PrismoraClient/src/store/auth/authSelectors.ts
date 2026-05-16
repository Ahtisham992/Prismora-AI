// src/store/auth/authSelectors.ts
import { RootState } from "../index";

export const selectAuthUser = (state: RootState) => state.user;
export const selectAuthToken = (state: RootState) => state.accessToken;
export const selectAuthLoading = (state: RootState) => state.loading;
