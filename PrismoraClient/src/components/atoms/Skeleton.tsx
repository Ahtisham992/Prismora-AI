import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const skeletonStyle: Animated.WithAnimatedObject<ViewStyle>[] = [
    styles.skeleton,
    { width, height, borderRadius, opacity },
    style as any,
  ];

  return <Animated.View style={skeletonStyle} />;
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
});
