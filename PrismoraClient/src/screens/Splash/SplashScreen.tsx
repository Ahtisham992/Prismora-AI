// src/screens/Splash/SplashScreen.js
import React from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAppInitialization } from '../../hooks/useAppInitialization';
import { Typography } from '../../components/atoms/Typography';
import PrismoraLogo from "../../assets/icons/PrismoraLogo.png";
import { Screen } from '../../components/layout/Screen';

const SplashScreen = ({ navigation }) => {
  const { colors,typography } = useTheme();

  // Custom hook handles initialization logic
  useAppInitialization(navigation);

  return (
    <Screen>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Prismora Logo */}
      <Image source={PrismoraLogo} style={styles.logo} resizeMode="contain" />

      {/* Prismora AI Text */}
      <Typography
        size="xxl"
        family={typography.families.postNoBillsJaffna.extraBold}
        color={colors.primary}
        style={styles.title}
      >
        Prismora AI
      </Typography>

      {/* Loader at the bottom */}
      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
    </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', // centers logo + text vertically
    alignItems: 'center',     // centers horizontally
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});

export default SplashScreen;
