// src/hooks/useAppInitialization.tsx
import { useEffect } from "react";
import { useStore } from "../store";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAppInitialization = (navigation) => {
  const loadStoredAuth = useStore((s) => s.loadStoredAuth);
  const fetchMyProfile = useStore((s) => s.fetchMyProfile);
  const user = useStore((s) => s.user);

  useEffect(() => {
    const init = async () => {
      await loadStoredAuth();

      // First launch → go to onboarding
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      if (hasLaunched) {
        // await AsyncStorage.setItem("hasLaunched", "true");
        return navigation.replace("OnboardingStack");
      }

      // If logged in load profile
      if (user) {
        await fetchMyProfile();
        return navigation.replace("AppStack");
      }

      return navigation.replace("AuthStack");
    };

    init();
  }, [user]);
};
