// TabIcon.js
import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { TAB_CONFIG } from './TabConfig';

// Props: routeName (string), focused (boolean), color (string), size (number), colors (theme colors)
export const TabIcon = ({ routeName, focused, color, size, colors }) => {
  // Find tab config for this route
  const tab = TAB_CONFIG.find(t => t.name === routeName);
  if (!tab) return null;

  // Special tab (Add) icon
  if (tab.isSpecial) {
    return <Ionicons name={tab.icon} size={30} color={colors.primary} />;
  }

  // Normal tab icon
  const iconName = focused ? tab.icon : tab.iconOutline;
  return <Ionicons name={iconName} size={size} color={color} />;
};
