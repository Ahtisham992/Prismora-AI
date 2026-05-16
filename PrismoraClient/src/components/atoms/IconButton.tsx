import React from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../hooks/useTheme';

type IconButtonProps = {
  name: string;
  size?: number;
  color?: string;
  onPress?: () => void;
};

export const IconButton: React.FC<IconButtonProps> = ({ name, size = 24, color, onPress }) => {
  const { colors } = useTheme();
  return <TouchableOpacity onPress={onPress}><Icon name={name} size={size} color={color || colors.text} /></TouchableOpacity>;
};
