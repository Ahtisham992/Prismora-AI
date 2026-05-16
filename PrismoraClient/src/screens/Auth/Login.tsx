// src/screens/Auth/Login.tsx

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Screen } from "../../components/layout/Screen";
import { VStack } from "../../components/layout/VStack";
import { Typography } from "../../components/atoms/Typography";
import { Input } from "../../components/atoms/Input";
import { Button } from "../../components/atoms/Button";
import { useTheme } from "../../hooks/useTheme";
import { useStore } from "../../store";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

const Login = () => {
  const navigation = useNavigation();
  const { colors, spacing } = useTheme();

  const loginUser = useStore((s) => s.loginUser);
  const googleLoginUser = useStore((s) => s.googleLoginUser);
  const loading = useStore((s) => s.loading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const result = await GoogleSignin.signIn();

      console.log("Google Sign-In Success:", result);

      const ok = await googleLoginUser(result.data?.idToken);

      if (ok) {
        navigation.replace("AppStack" as never);
      } else {
        alert("Google login failed at backend");
      }
    } catch (error: any) {
      console.log("GOOGLE SIGN-IN ERROR:", JSON.stringify(error, null, 2));
      alert("Google Sign-In failed: " + error.message);
    }
  };

  const handleSignIn = async () => {
    const ok = await loginUser({ email, password });

    if (ok) {
      navigation.replace("AppStack" as never);
    } else {
      alert("Invalid email or password");
    }
  };

  const handleSignUp = () => {
    navigation.navigate("Register" as never);
  };

  return (
    <Screen style={styles.screen} padding={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.container, { paddingHorizontal: spacing.xl }]}>
            <VStack spacing={spacing.lg}>
              {/* Logo Section */}
              <View style={styles.logoSection}>
                <View style={styles.logoContainer}>
                  <Image
                    source={require("../../assets/icons/PrismoraLogo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
                <Typography
                  variant="body"
                  style={[styles.brandName, { color: colors.primary }]}
                >
                  Prismora AI
                </Typography>
              </View>

              {/* Title */}
              <Typography variant="h1" style={styles.title} color={colors.text}>
                Let's you in
              </Typography>

              {/* Google Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.googleButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                  },
                ]}
                onPress={handleGoogleSignIn}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: "https://www.google.com/favicon.ico" }}
                  style={styles.googleIcon}
                />
                <Typography
                  variant="body"
                  style={styles.googleButtonText}
                  color={colors.text}
                >
                  Continue with Google
                </Typography>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: colors.border },
                  ]}
                />
                <Typography
                  variant="body"
                  style={[
                    styles.dividerText,
                    {
                      color: colors.textSecondary,
                      paddingHorizontal: spacing.md,
                    },
                  ]}
                >
                  or
                </Typography>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: colors.border },
                  ]}
                />
              </View>

              {/* Email */}
              <Input
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              {/* Password */}
              <Input
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />

              {/* Sign In */}
              <Button
                title={loading ? "Signing in..." : "Sign in"}
                onPress={handleSignIn}
                variant="primary"
                disabled={loading}
              />

              {/* Sign Up */}
              <View style={styles.signUpContainer}>
                <Typography
                  variant="body"
                  style={{ color: colors.textSecondary }}
                >
                  Don't have an account?{" "}
                </Typography>
                <TouchableOpacity onPress={handleSignUp}>
                  <Typography
                    variant="body"
                    style={[styles.signUpLink, { color: colors.primary }]}
                  >
                    Sign up
                  </Typography>
                </TouchableOpacity>
              </View>
            </VStack>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    flex: 1,
    justifyContent: "center",
  },

  logoSection: {
    alignItems: "center",
    marginBottom: 8,
  },

  logoContainer: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },

  logo: {
    width: "100%",
    height: "100%",
  },

  brandName: {
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  title: {
    textAlign: "left",
    fontWeight: "700",
  },

  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },

  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },

  googleButtonText: {
    fontWeight: "500",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  dividerLine: {
    flex: 1,
    height: 1,
  },

  dividerText: {
    fontWeight: "500",
  },

  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  signUpLink: {
    fontWeight: "600",
  },
});

export default Login;