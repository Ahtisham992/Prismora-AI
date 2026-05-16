// src/store/auth/authSlice.ts
import { StateCreator } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../services/authService';
import { AuthSlice } from './authTypes';

export const createAuthSlice: StateCreator<AuthSlice> = (set, get) => ({
  user: null,
  accessToken: null,
  loading: false,

  loadStoredAuth: async () => {
    const token = await AsyncStorage.getItem('accessToken');
    const user = await AsyncStorage.getItem('user');

    if (token && user) {
      set({
        accessToken: token,
        user: JSON.parse(user),
      });

      // Fetch full profile
      await get().fetchMyProfile();
    }
  },

  registerUser: async payload => {
    try {
      set({ loading: true });

      const res = await authService.register(payload);

      await AsyncStorage.setItem('accessToken', res.data.accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));

      set({
        user: res.data.user,
        accessToken: res.data.accessToken,
        loading: false,
      });

      await get().fetchMyProfile();
      return true;
    } catch {
      set({ loading: false });
      return false;
    }
  },

  loginUser: async payload => {
    try {
      set({ loading: true });

      const res = await authService.login(payload);

      await AsyncStorage.setItem('accessToken', res.data.accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));

      set({
        user: res.data.user,
        accessToken: res.data.accessToken,
        loading: false,
      });

      await get().fetchMyProfile();
      return true;
    } catch {
      set({ loading: false });
      return false;
    }
  },

  googleLoginUser: async googleToken => {
    try {
      set({ loading: true });

      const res = await authService.googleLogin(googleToken);

      await AsyncStorage.setItem('accessToken', res.data.accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));

      set({
        user: res.data.user,
        accessToken: res.data.accessToken,
        loading: false,
      });

      await get().fetchMyProfile();
      return true;
    } catch {
      set({ loading: false });
      return false;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('user');

    set({
      user: null,
      accessToken: null,
      loading: false,
      profile: null,
    });
  },
});
export { AuthSlice };
