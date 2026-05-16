import { lightColors, darkColors } from "./components/colors";
import { radius } from "./components/radius";
import { shadows } from "./components/shadows";
import { spacing } from "./components/spacing";
import { fontFamilies } from "./components/typography";

export const theme = {
  // Color modes — you can switch dynamically
  colors: {
    light: lightColors,
    dark: darkColors,
  },

  // Spacing scale
  spacing,

  // Corner radius tokens
  radius,

  // Shadow presets
  shadows,

  // Typography system
  typography: {
    families: fontFamilies,
  },
};
