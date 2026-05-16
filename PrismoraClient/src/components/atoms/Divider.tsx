import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type DividerProps = {
  thickness?: number;
  color?: string;
  marginVertical?: number;
  style?: StyleProp<ViewStyle>;
};

export const Divider: React.FC<DividerProps> = ({ thickness = 1, color, marginVertical = 0, style }) => {
  const { colors } = useTheme();
  return <View style={[{ height: thickness, backgroundColor: color || colors.border, marginVertical }, style]} />;
};
