import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface InputProps extends TextInputProps {
  style?: any; // allow additional style overrides
}

export const Input: React.FC<InputProps> = ({ style, ...rest }) => {
  const { colors, radius, spacing } = useTheme();

  const inputStyles = [
    styles.input,
    {
      backgroundColor: colors.surface,
      color: colors.text,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      borderColor: colors.border,
    },
    style,
  ];

  return <TextInput style={inputStyles} placeholderTextColor={colors.placeholder} {...rest} />;
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
  },
});
