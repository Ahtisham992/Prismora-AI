import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeStack from '../stacks/HomeStack';
import DiscoverStack from '../stacks/DiscoverStack';
import AddStack from '../stacks/AddStack';
import NotificationsStack from '../stacks/NotificationsStack';
import ProfileStack from '../stacks/ProfileStack';
import { useTheme } from '../../hooks/useTheme';

const Tab = createBottomTabNavigator();

// Tab configuration
const TAB_CONFIG = [
  { name: 'Home', component: HomeStack, icon: 'home', iconOutline: 'home-outline' },
  { name: 'Discover', component: DiscoverStack, icon: 'search', iconOutline: 'search-outline' },
  { name: 'Add', component: AddStack, icon: 'add', iconOutline: 'add', isSpecial: true },
  { name: 'Notifications', component: NotificationsStack, icon: 'notifications', iconOutline: 'notifications-outline' },
  { name: 'Profile', component: ProfileStack, icon: 'person', iconOutline: 'person-outline' },
];

// Stable tab icon component
const TabIcon = ({ routeName, focused, color, size }) => {
  const tab = TAB_CONFIG.find(t => t.name === routeName);
  if (!tab) return null;
  if (tab.isSpecial) return <Ionicons name={tab.icon} size={30} color="#6F30C6" />;
  const iconName = focused ? tab.icon : tab.iconOutline;
  return <Ionicons name={iconName} size={size} color={color} />;
};

// Stable AddButton component
const AddButton = ({ children, onPress, backgroundColor }) => (
  <TouchableOpacity style={styles.addButtonContainer} activeOpacity={0.8} onPress={onPress}>
    <View style={[styles.addButton, { backgroundColor }]}>{children}</View>
  </TouchableOpacity>
);

// Stable AddTabButton component for tabBarButton
const AddTabButton = ({ backgroundColor, ...props }) => (
  <AddButton {...props} backgroundColor={backgroundColor}>
    <Ionicons name="add" size={30} color="#6F30C6" />
  </AddButton>
);

export default function BottomTabNavigator() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const TAB_BAR_BASE = 70;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        // In dark mode use white for inactive icons; in light mode use textSecondary
        tabBarInactiveTintColor: isDark ? '#FFFFFF' : colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 8,
          height: TAB_BAR_BASE + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
      }}
    >
      {TAB_CONFIG.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarIcon: (props) => <TabIcon {...props} routeName={tab.name} />,
            tabBarButton: tab.isSpecial 
              ? (props) => <AddTabButton {...props} backgroundColor={colors.background} /> 
              : undefined,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  addButtonContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});