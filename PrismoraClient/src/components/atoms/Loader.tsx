import React from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface LoaderProps {
  size?: 'small' | 'large' | number;
  color?: string;
  style?: ViewStyle;
}

export const Loader: React.FC<LoaderProps> = ({ size = 'large', color, style }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color || colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display:"flex",
    justifyContent: 'center',
    alignItems: 'center',
  },
});
