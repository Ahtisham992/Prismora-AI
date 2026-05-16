import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type CheckboxProps = {
  checked: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onPress, disabled }) => {
  const { colors } = useTheme();

  // Compute dynamic styles outside JSX
  const dynamicContainerStyle: ViewStyle = {
    borderColor: colors.border,
    backgroundColor: checked ? colors.primary : 'transparent',
  };

  const dynamicInnerBoxStyle: ViewStyle = {
    backgroundColor: '#fff',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, dynamicContainerStyle]}
    >
      {checked && <View style={[styles.innerBox, dynamicInnerBoxStyle]} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  innerBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  } as ViewStyle,
});
