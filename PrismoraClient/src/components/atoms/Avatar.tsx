import React from 'react';
import { Image, ImageSourcePropType, StyleProp, ImageStyle } from 'react-native';

type AvatarProps = {
  size?: number;
  source: ImageSourcePropType;
  borderRadius?: number;
  style?: StyleProp<ImageStyle>;
};

export const Avatar: React.FC<AvatarProps> = ({ size = 40, source, borderRadius, style }) => (
  <Image
    source={source}
    style={[
      { width: size, height: size, borderRadius: borderRadius ?? size / 2 },
      style,
    ]}
    resizeMode="cover"
  />
);
