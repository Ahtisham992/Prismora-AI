// src/navigation/stacks/ProfileStack.tsx

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../../screens/Profile/ProfileScreen';
import EditProfileScreen from '../../screens/Profile/EditProfileScreen';

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  EditProfile: undefined;
  
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
     
    </Stack.Navigator>
  );
}