import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NotificationsScreen from '../../screens/Notifications/NotificationsScreen';

const Stack = createNativeStackNavigator();

export default function NotificationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
