import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  style?: any;
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  const { colors, radius, spacing } = useTheme();

  const backgroundColor = disabled
    ? colors.border
    : variant === 'primary'
    ? colors.primary
    : colors.surface;

  const textColor = variant === 'primary' ? colors.onPrimary : colors.text;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.pill }, style]}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});
