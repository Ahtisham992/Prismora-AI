// src/store/user/userSlice.ts
import { StateCreator } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userService } from "../../services/userService";
import { UserSlice, UserProfile } from "./userTypes";

export const createUserSlice: StateCreator<UserSlice> = (set, get) => ({
  profile: null,
  loadingUser: false,

  fetchMyProfile: async () => {
    try {
      set({ loadingUser: true });

      const res = await userService.getMe();
      const profile = res.data as UserProfile;

      set({ profile, loadingUser: false });
      await AsyncStorage.setItem("user", JSON.stringify(profile));
    } catch (error) {
      console.log("FETCH PROFILE ERROR:", error);
      set({ loadingUser: false });
    }
  },

  updateProfile: async (payload) => {
    try {
      set({ loadingUser: true });

      const res = await userService.updateProfile(payload);
      const updated = res.data as UserProfile;

      set({ profile: updated, loadingUser: false });
      await AsyncStorage.setItem("user", JSON.stringify(updated));

      return true;
    } catch (error) {
      console.log("UPDATE PROFILE ERROR:", error);
      set({ loadingUser: false });
      return false;
    }
  },

  updateUsername: async (username: string) => {
    try {
      set({ loadingUser: true });

      const res = await userService.updateUsername(username);

      const current = get().profile;
      if (!current) return false;

      const updatedProfile = { ...current, username: res.data.username };

      set({ profile: updatedProfile, loadingUser: false });
      await AsyncStorage.setItem("user", JSON.stringify(updatedProfile));

      return true;
    } catch (error) {
      console.log("UPDATE USERNAME ERROR:", error);
      set({ loadingUser: false });
      return false;
    }
  },

  updatePhoto: async (url: string) => {
    try {
      set({ loadingUser: true });

      const current = get().profile;
      if (!current) return false;

      const updatedProfile: UserProfile = {
        ...current,
        profilePhoto: url,
      };

      set({ profile: updatedProfile, loadingUser: false });
      await AsyncStorage.setItem("user", JSON.stringify(updatedProfile));

      return true;
    } catch (error) {
      console.log("UPDATE PHOTO ERROR:", error);
      set({ loadingUser: false });
      return false;
    }
  },
});
