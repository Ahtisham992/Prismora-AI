import React from 'react';
import { Text, TouchableOpacity, StyleProp, TextStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type LinkProps = {
  onPress?: () => void;
  text: string;
  color?: string;
  underline?: boolean;
  style?: StyleProp<TextStyle>;
};

export const Link: React.FC<LinkProps> = ({ onPress, text, color, underline , style }) => {
  const { colors } = useTheme();

  // Dynamic text style
  const dynamicTextStyle: StyleProp<TextStyle> = {
    color: color || colors.primary,
    textDecorationLine: underline ? 'underline' : 'none',
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={[styles.text, dynamicTextStyle, style]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  text: {
    // any default text styles if needed
    fontSize: 16,
  },
});
