// src/screens/Auth/Register.tsx

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Screen } from "../../components/layout/Screen";
import { VStack } from "../../components/layout/VStack";
import { Typography } from "../../components/atoms/Typography";
import { Input } from "../../components/atoms/Input";
import { Button } from "../../components/atoms/Button";
import { useTheme } from "../../hooks/useTheme";
import { IconButton } from "../../components/atoms/IconButton";
import Icon from "react-native-vector-icons/Ionicons";
import { useStore } from "../../store";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

const Register = () => {
  const navigation = useNavigation();
  const { colors, spacing } = useTheme();

  const registerUser = useStore((s) => s.registerUser);
  const googleLoginUser = useStore((s) => s.googleLoginUser);
  const loading = useStore((s) => s.loading);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  /** VALIDATION */

  const validateFirstName = (text: string) => {
    if (!text.trim()) {
      setFirstNameError("First name is required");
      return false;
    }
    setFirstNameError("");
    return true;
  };

  const validateLastName = (text: string) => {
    if (!text.trim()) {
      setLastNameError("Last name is required");
      return false;
    }
    setLastNameError("");
    return true;
  };

  const validateEmail = (text: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!text) {
      setEmailError("Email is required");
      return false;
    }

    if (!regex.test(text)) {
      setEmailError("Please enter a valid email");
      return false;
    }

    setEmailError("");
    return true;
  };

  const validatePassword = (text: string) => {
    if (!text) {
      setPasswordError("Password is required");
      return false;
    }

    if (text.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }

    setPasswordError("");
    return true;
  };

  /** REGISTER */

  const handleSignUp = async () => {
    const firstNameValid = validateFirstName(firstName);
    const lastNameValid = validateLastName(lastName);
    const emailValid = validateEmail(email);
    const passValid = validatePassword(password);

    if (!firstNameValid || !lastNameValid || !emailValid || !passValid) return;

    const ok = await registerUser({
      firstName,
      lastName,
      email,
      password,
    });

    if (ok) navigation.replace("AppStack" as never);
    else alert("Registration failed");
  };

  /** GOOGLE SIGNUP */

  const handleGoogleSignUp = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();

      const ok = await googleLoginUser(result.data.idToken);

      if (ok) navigation.replace("AppStack" as never);
      else alert("Google signup failed");
    } catch (e) {
      console.log(e);
      alert("Google signup error");
    }
  };

  const handleSignIn = () => navigation.navigate("Login" as never);
  const handleBack = () => navigation.goBack();

  return (
    <Screen style={styles.screen} padding={false}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.container, { paddingHorizontal: spacing.xl }]}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <IconButton name="arrow-back" />
            </TouchableOpacity>

            <VStack spacing={spacing.lg}>
              {/* TITLE */}
              <Typography variant="h1" style={styles.title} color={colors.text}>
                Create your{"\n"}Account
              </Typography>

              {/* FIRST NAME */}

              <View>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="person-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.iconLeft}
                  />

                  <Input
                    placeholder="First Name"
                    value={firstName}
                    onChangeText={(t) => {
                      setFirstName(t);
                      if (firstNameError) validateFirstName(t);
                    }}
                    autoCapitalize="words"
                    style={[
                      styles.input,
                      firstNameError && { borderColor: colors.error },
                    ]}
                  />
                </View>

                {firstNameError ? (
                  <Typography
                    variant="caption"
                    style={[styles.errorText, { color: colors.error }]}
                  >
                    {firstNameError}
                  </Typography>
                ) : null}
              </View>

              {/* LAST NAME */}

              <View>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="person-circle-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.iconLeft}
                  />

                  <Input
                    placeholder="Last Name"
                    value={lastName}
                    onChangeText={(t) => {
                      setLastName(t);
                      if (lastNameError) validateLastName(t);
                    }}
                    autoCapitalize="words"
                    style={[
                      styles.input,
                      lastNameError && { borderColor: colors.error },
                    ]}
                  />
                </View>

                {lastNameError ? (
                  <Typography
                    variant="caption"
                    style={[styles.errorText, { color: colors.error }]}
                  >
                    {lastNameError}
                  </Typography>
                ) : null}
              </View>

              {/* EMAIL */}

              <View>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="mail-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.iconLeft}
                  />

                  <Input
                    placeholder="Email"
                    value={email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(t) => {
                      setEmail(t);
                      if (emailError) validateEmail(t);
                    }}
                    style={[
                      styles.input,
                      emailError && { borderColor: colors.error },
                    ]}
                  />
                </View>

                {emailError ? (
                  <Typography
                    variant="caption"
                    style={[styles.errorText, { color: colors.error }]}
                  >
                    {emailError}
                  </Typography>
                ) : null}
              </View>

              {/* PASSWORD */}

              <View>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="lock-closed-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.iconLeft}
                  />

                  <Input
                    placeholder="Password"
                    value={password}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onChangeText={(t) => {
                      setPassword(t);
                      if (passwordError) validatePassword(t);
                    }}
                    style={[
                      styles.input,
                      passwordError && { borderColor: colors.error },
                    ]}
                  />

                  <TouchableOpacity
                    style={styles.iconRight}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Icon
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {passwordError ? (
                  <Typography
                    variant="caption"
                    style={[styles.errorText, { color: colors.error }]}
                  >
                    {passwordError}
                  </Typography>
                ) : null}
              </View>

              {/* SIGN UP */}

              <Button
                title={loading ? "Signing up..." : "Sign up"}
                onPress={handleSignUp}
                disabled={loading}
              />

              {/* DIVIDER */}

              <View style={styles.dividerContainer}>
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />

                <Typography
                  variant="body"
                  style={[styles.dividerText, { color: colors.textSecondary }]}
                >
                  or continue with
                </Typography>

                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              </View>

              {/* GOOGLE BUTTON */}

              <View style={styles.googleWrapper}>
                <TouchableOpacity
                  style={[styles.googleButton, { borderColor: colors.border }]}
                  onPress={handleGoogleSignUp}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Image
                      source={{ uri: "https://www.google.com/favicon.ico" }}
                      style={styles.googleIcon}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* SIGN IN */}

              <View style={styles.signInContainer}>
                <Typography
                  variant="body"
                  style={{ color: colors.textSecondary }}
                >
                  Already have an account?{" "}
                </Typography>

                <TouchableOpacity onPress={handleSignIn}>
                  <Typography variant="body" style={{ color: colors.primary }}>
                    Sign in
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
  screen: { flex: 1 },

  keyboard: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
  },

  container: {
    flex: 1,
    justifyContent: "center",
  },

  backButton: {
    position: "absolute",
    top: 60,
    left: 32,
    zIndex: 20,
  },

  title: {
    fontWeight: "700",
    lineHeight: 38,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },

  input: {
    flex: 1,
    paddingLeft: 48,
  },

  iconLeft: {
    position: "absolute",
    left: 12,
    zIndex: 1,
  },

  iconRight: {
    position: "absolute",
    right: 12,
    zIndex: 1,
  },

  errorText: {
    marginTop: 4,
    marginLeft: 4,
    fontSize: 12,
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },

  divider: {
    flex: 1,
    height: 1,
  },

  dividerText: {
    paddingHorizontal: 10,
  },

  googleWrapper: {
    alignItems: "center",
  },

  googleButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  googleIcon: {
    width: 24,
    height: 24,
  },

  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
});

export default Register;