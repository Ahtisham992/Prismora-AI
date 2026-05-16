// components/atoms/Switch.tsx
import React from 'react';
import { Switch as RNSwitch } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export const Toggle: React.FC<ToggleProps> = ({ value, onValueChange, disabled = false }) => {
  const { colors } = useTheme();
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ true: colors.primary, false: colors.border }}
    />
  );
};

// Export Switch as an alias for Toggle to support both naming conventions
export const Switch: React.FC<ToggleProps> = Toggle;