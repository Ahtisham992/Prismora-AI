import React from 'react';
import { View, Text, StyleSheet, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type BadgeProps = {
  text: string;
  variant?: 'success' | 'error' | 'warning';
  size?: number;
  style?: StyleProp<TextStyle>;
};

export const Badge: React.FC<BadgeProps> = ({ text, variant = 'success', size = 12, style }) => {
  const { colors, spacing } = useTheme();

  const backgroundColor =
    variant === 'success' ? colors.success :
    variant === 'error' ? colors.error :
    colors.warning;

  return (
    <View style={[styles.container, { backgroundColor, borderRadius: size, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}>
      <Text style={[styles.text, { fontSize: size }, style]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // other static container styles can go here
  } as ViewStyle,
  text: {
    color: '#fff',
  } as TextStyle,
});
