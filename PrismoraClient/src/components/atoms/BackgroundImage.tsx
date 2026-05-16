import React from 'react';
import { ImageBackground, ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

type BackgroundImageProps = {
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
};

export const BackgroundImage: React.FC<BackgroundImageProps> = ({ source, style, children, resizeMode = 'cover' }) => (
  <ImageBackground source={source} style={style} resizeMode={resizeMode}>
    {children}
  </ImageBackground>
);
