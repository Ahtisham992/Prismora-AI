// src/navigation/RootNavigator.js
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashStack from './stacks/SplashStack';
import OnboardingStack from './stacks/OnboardingStack';
import AuthStack from './stacks/AuthStack';
import AppStack from './stacks/AppStack';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SplashStack" component={SplashStack} />
        <Stack.Screen name="OnboardingStack" component={OnboardingStack} />
        <Stack.Screen name="AuthStack" component={AuthStack} />
        <Stack.Screen name="AppStack" component={AppStack} />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}
