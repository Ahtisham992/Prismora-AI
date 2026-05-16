import { RootState } from "../index";

export const selectUserProfile = (s: RootState) => s.profile;
export const selectUserLoading = (s: RootState) => s.loadingUser;

export const selectUsername = (s: RootState) => s.profile?.username;
export const selectProfilePhoto = (s: RootState) => s.profile?.profilePhoto;

export const selectFullName = (s: RootState) =>
  s.profile ? `${s.profile.firstName} ${s.profile.lastName}` : "";
