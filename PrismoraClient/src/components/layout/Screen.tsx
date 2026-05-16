import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { ThemedStatusBar } from './ThemedStatusBar';

type ScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: boolean;
};

export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  padding = true,
}) => {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  /**
   * On Android, gesture navigation provides bottom inset.
   * Button navigation may have 0 inset, so add extra padding.
   */
  const bottomPadding =
    Platform.OS === 'android'
      ? Math.max(insets.bottom) 
      : insets.bottom;

  const dynamicStyle: ViewStyle = {
    paddingTop: insets.top,
    paddingBottom: bottomPadding,
    paddingHorizontal: padding ? spacing.md : 0,
    backgroundColor: colors.background,
  };

  return (
    <KeyboardAvoidingView
      style={styles.avoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={[styles.container, dynamicStyle, style]}>
        <ThemedStatusBar />
        {children}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  avoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});