// Typography.tsx
import React from 'react';
import { Text, TextProps, StyleProp, TextStyle } from 'react-native';
import { fontFamilies, fontSizes } from '../../styles/theme/components/typography';

type FontFamilyKey = keyof typeof fontFamilies;
type FontVariantKey<F extends FontFamilyKey> = keyof typeof fontFamilies[F];
type FontSizeKey = keyof typeof fontSizes;

type TypographyVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'small';

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  size?: FontSizeKey;
  family?: `${FontFamilyKey}.${string}` | string; // theme-based or raw font family
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

// Default variant mapping
const variantDefaults: Record<TypographyVariant, { size: FontSizeKey; family: string; color?: string }> = {
  h1: { size: 'xxl', family: 'poppins.bold' },
  h2: { size: 'xl', family: 'poppins.semiBold' },
  h3: { size: 'lg', family: 'poppins.medium' },
  body: { size: 'md', family: 'poppins.regular' },
  caption: { size: 'sm', family: 'poppins.regular' },
  small: { size: 'xs', family: 'poppins.regular' },
};

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  size,
  family,
  color,
  style,
  children,
  ...rest
}) => {
  const defaults = variantDefaults[variant];

  const finalSize = size || defaults.size;
  let fontFamily = defaults.family;

  if (family && typeof family === 'string') {
    if (family.includes('.')) {
      const [mainFamily, variantKey] = family.split('.') as [FontFamilyKey, string];
      if (fontFamilies[mainFamily] && fontFamilies[mainFamily][variantKey as FontVariantKey<FontFamilyKey>]) {
        fontFamily = fontFamilies[mainFamily][variantKey as FontVariantKey<FontFamilyKey>];
      }
    } else {
      fontFamily = family;
    }
  }

  return (
    <Text
      style={[
        {
          fontFamily,
          fontSize: fontSizes[finalSize],
          color,
        },
        style, // any extra overrides
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};
