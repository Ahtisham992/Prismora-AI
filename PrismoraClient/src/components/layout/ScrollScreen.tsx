// src/components/layout/ScrollScreen.tsx
import React from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

type ScrollScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  padding?: boolean;
  showsVerticalScrollIndicator?: boolean;
};

export const ScrollScreen: React.FC<ScrollScreenProps> = ({
  children,
  style,
  contentContainerStyle,
  padding = true,
  showsVerticalScrollIndicator = false,
}) => {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background,
  };

  const contentStyle: ViewStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingHorizontal: padding ? spacing.md : 0,
  };

  return (
    <KeyboardAvoidingView
      style={styles.avoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[containerStyle, style]}
        contentContainerStyle={[contentStyle, contentContainerStyle]}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  avoidingView: {
    flex: 1,
  },
});
