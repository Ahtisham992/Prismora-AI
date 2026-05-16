import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';

type HStackProps = {
  children: React.ReactNode;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
};

export const HStack: React.FC<HStackProps> = ({
  children,
  spacing = 12,
  style,
  align = 'center',
  justify = 'flex-start',
}) => {
  const count = React.Children.count(children);

  const wrapped = React.Children.map(children, (child, index) => {
    const isLast = index === count - 1;
    return (
      <View style={[styles.child, !isLast && { marginRight: spacing }]}>
        {child}
      </View>
    );
  });

  return (
    <View style={[styles.row, { alignItems: align, justifyContent: justify }, style]}>
      {wrapped}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  child: {
    // marginRight is injected dynamically only when needed
  },
});
