import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Onboarding1 from '../../screens/Onboarding/Onboarding1';
import Onboarding2 from '../../screens/Onboarding/Onboarding2';
import Onboarding3 from '../../screens/Onboarding/Onboarding3';

const Stack = createNativeStackNavigator();

export default function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding1" component={Onboarding1} />
      <Stack.Screen name="Onboarding2" component={Onboarding2} />
      <Stack.Screen name="Onboarding3" component={Onboarding3} />
    </Stack.Navigator>
  );
}
