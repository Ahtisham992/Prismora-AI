import React, { useRef } from 'react';
import { Animated, Pressable, ViewProps, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  onPress?: () => void;
  pressable?: boolean; // make card pressable
  shadow?: 'sm' | 'md' | 'lg'; // pick shadow size
}

export const Card: React.FC<CardProps> = ({
  style,
  children,
  onPress,
  pressable = false,
  shadow = 'md',
  ...rest
}) => {
  const { colors, radius, spacing, shadows } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  const dynamicStyles = {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.sm,
    transform: [{ scale }],
    ...shadows[shadow], // apply shadow preset
  };

  const CardContent = (
    <Animated.View style={[styles.card, dynamicStyles, style]} {...rest}>
      {children}
    </Animated.View>
  );

  if (pressable && onPress) {
    return (
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {CardContent}
      </Pressable>
    );
  }

  return CardContent;
};

const styles = StyleSheet.create({
  card: {
    // elevation is handled by shadows preset for Android
  },
});
