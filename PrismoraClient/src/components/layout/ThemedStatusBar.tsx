import { StatusBar } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export const ThemedStatusBar = () => {
  const { isDark } = useTheme();

  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor="transparent"
      translucent
    />
  );
};
