// src/navigation/stacks/AppStack.tsx

import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabNavigator from "../tabs/BottomTabNavigator";
import { useStore } from "../../store";
import { ActivityIndicator, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import PostViewerScreen from "../../screens/Profile/PostViewerScreen";
import OtherUserProfileScreen from "../../screens/Profile/OtherUserProfileScreen";
import FollowersScreen from "../../screens/Profile/FollowersScreen";

const Stack = createNativeStackNavigator();

export default function AppStack() {
  const navigation = useNavigation<any>();

  const user = useStore((s) => s.user);
  const loadStoredAuth = useStore((s) => s.loadStoredAuth);

  const [checkingAuth, setCheckingAuth] = useState(true);

  /** 1️⃣ Load stored auth ONCE (AsyncStorage) */
  useEffect(() => {
    const verify = async () => {
      await loadStoredAuth();
      setCheckingAuth(false);
    };
    verify();
  }, []);

  /** 2️⃣ Redirect to AuthStack ONLY inside useEffect */
  useEffect(() => {
    if (checkingAuth) return;

    if (!user) {
      navigation.reset({
        index: 0,
        routes: [{ name: "AuthStack" }],
      });
    }
  }, [checkingAuth, user]);

  /** 3️⃣ Show loading while checking auth */
  if (checkingAuth) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "white",
        }}
      >
        <ActivityIndicator size="large" color="#6F30C6" />
      </View>
    );
  }

  /** 4️⃣ If user is NULL, we already redirected above */
  if (!user) return null;

  /** 5️⃣ Authenticated → load Main App */
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen
          name="Followers"
          component={FollowersScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="OtherUserProfile"
          component={OtherUserProfileScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="PostViewer"
          component={PostViewerScreen}
          options={{
            animation: 'fade',
          }}
        />
    </Stack.Navigator>
  );
}
