import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';

type StackProps = {
  children: React.ReactNode;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
};

export const VStack: React.FC<StackProps> = ({ children, spacing = 12, style }) => {
  const count = React.Children.count(children);

  const wrapped = React.Children.map(children, (child, index) => {
    const dynamicStyle = {
      marginBottom: index === count - 1 ? 0 : spacing,
    };

    return <View style={[styles.child, dynamicStyle]}>{child}</View>;
  });

  return <View style={[styles.container, style]}>{wrapped}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  child: {},
});
