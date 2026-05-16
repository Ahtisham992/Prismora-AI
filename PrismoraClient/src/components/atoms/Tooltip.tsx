import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type HelperTextProps = {
  text: string;
  error?: boolean;
  style?: StyleProp<TextStyle>;
};

export const HelperText: React.FC<HelperTextProps> = ({ text, error = false, style }) => {
  const { colors } = useTheme();

  // Generate dynamic style based on theme/colors
  const textStyle = [styles.text, { color: error ? colors.error : colors.textSecondary }, style];

  return <Text style={textStyle}>{text}</Text>;
};

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
  },
});
