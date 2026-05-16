import React, { useEffect, useState } from 'react';
import { Image, StyleProp, ImageStyle } from 'react-native';

interface Props {
  uri: string;
  style: StyleProp<ImageStyle>;
}

const SmartImage: React.FC<Props> = ({ uri, style }) => {
  const [resizeMode, setResizeMode] = useState<'cover' | 'contain'>('cover');

  useEffect(() => {
    if (!uri) return;

    Image.getSize(
      uri,
      (width, height) => {
        const ratio = height / width;

        if (ratio < 1.5) {
          setResizeMode('contain'); // landscape / square
        } else {
          setResizeMode('cover'); // reel style
        }
      },
      () => {
        setResizeMode('cover');
      }
    );
  }, [uri]);

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
    />
  );
};

export default SmartImage;