import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../../screens/Splash/SplashScreen';

const Stack = createNativeStackNavigator();

export default function SplashStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
    </Stack.Navigator>
  );
}
