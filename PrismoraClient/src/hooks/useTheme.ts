import { theme } from '../styles/theme/theme';
import useDarkMode from './useDarkMode';

export const useTheme = () => {
  const isDark = useDarkMode();

  // Pick active color palette
  const colors = isDark ? theme.colors.dark : theme.colors.light;

  return {
    isDark,
    colors,
    spacing: theme.spacing,
    radius: theme.radius,
    shadows: theme.shadows,
    typography: theme.typography,
  };
};
