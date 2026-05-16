// src/navigation/stacks/DiscoverStack.tsx

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DiscoverScreen from '../../screens/Discover/DiscoverScreen';
import SearchResultsScreen from '../../screens/Search/SearchResultsScreen';

export type DiscoverStackParamList = {
  DiscoverScreen: undefined;
  SearchResults:undefined;
};

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export default function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiscoverScreen" component={DiscoverScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
    </Stack.Navigator>
  );
}