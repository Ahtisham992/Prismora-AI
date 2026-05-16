import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  View,
  TouchableWithoutFeedback,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

type ModalProps = {
  visible: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backdropOpacity?: number;
  dismissOnBackdropPress?: boolean;
};

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  style,
  backdropOpacity = 0.5,
  dismissOnBackdropPress = true,
}) => {
  const { colors, radius, spacing } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacity, scale]);

  const backdropStyle = {
    backgroundColor: `rgba(0,0,0,${backdropOpacity})`,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  };

  const animatedCardStyle = {
    transform: [{ scale }],
    opacity,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
  };

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none" // we control animation manually
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback
        onPress={dismissOnBackdropPress ? onClose : undefined}
      >
        <View style={backdropStyle}>
          <TouchableWithoutFeedback>
            <Animated.View style={[animatedCardStyle, style]}>
              {children}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};
