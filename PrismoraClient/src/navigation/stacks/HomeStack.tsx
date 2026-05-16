// src/navigation/stacks/HomeStack.tsx

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../../screens/Home/HomeScreen';
import FollowersScreen from '../../screens/Profile/FollowersScreen';
import OtherUserProfileScreen from '../../screens/Profile/OtherUserProfileScreen';
import PostViewerScreen from '../../screens/Profile/PostViewerScreen';

export type HomeStackParamList = {
  HomeScreen: undefined;

  OtherUserProfile: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified?: boolean;
  };

  PostViewer: {
    posts: any[];
    initialIndex?: number;
    username: string;
  };

  Followers: {
    initialTab: 'followers' | 'following';
    username: string;
    userId: string;
  };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen
        name="OtherUserProfile"
        component={OtherUserProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PostViewer"
        component={PostViewerScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Followers"
        component={FollowersScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}