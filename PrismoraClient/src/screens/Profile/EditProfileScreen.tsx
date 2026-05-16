// src/screens/Profile/EditProfileScreen.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { Typography } from "../../components/atoms/Typography";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { EditFieldModal } from "./components/EditFieldModal";
import { useStore } from "../../store";
import { Screen } from "../../components/layout/Screen";

type EditField = "name" | "username" | "bio" | "phone" | null;

const EditProfileScreen = () => {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();

  const profile = useStore((s) => s.profile);
  const logout = useStore((s) => s.logout);
  const updateProfile = useStore((s) => s.updateProfile);
  const updateUsername = useStore((s) => s.updateUsername);
  const loadingUser = useStore((s) => s.loadingUser);

  const [profileData, setProfileData] = useState({
    name: "",
    username: "",
    bio: "",
    phone: "",
  });

  const [editingField, setEditingField] = useState<EditField>(null);

  useEffect(() => {
    if (profile) {
      setProfileData({
        name: `${profile.firstName} ${profile.lastName}`,
        username: profile.username,
        bio: profile.bio || "",
        phone: profile.phoneNumber || "",
      });
    }
  }, [profile]);

  // Save profile
  const handleSave = async () => {
    if (!profile) return;

    const [firstName, ...rest] = profileData.name.split(" ");
    const lastName = rest.join(" ");

    if (profile.username !== profileData.username) {
      const ok = await updateUsername(profileData.username);
      if (!ok) return Alert.alert("Error", "Username already taken.");
    }

    const ok = await updateProfile({
      firstName,
      lastName,
      bio: profileData.bio,
      phoneNumber: profileData.phone,
    });

    if (!ok) {
      return Alert.alert("Error", "Could not update profile.");
    }

    Alert.alert("Success", "Profile updated successfully!");
    navigation.goBack();
  };

  const handleChangeAvatar = () => {
    Alert.alert("Coming Soon", "Profile photo change is not implemented yet.");
  };

  const handleFieldSave = (field: EditField, value: string) => {
    if (field) {
      setProfileData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const renderEditRow = (
    icon: string,
    label: string,
    value: string,
    field: EditField,
    isLast: boolean = false
  ) => (
    <TouchableOpacity
      style={[
        styles.editRow,
        { borderBottomColor: colors.border },
        isLast && styles.lastRow,
      ]}
      onPress={() => setEditingField(field)}
    >
      <View style={styles.editRowLeft}>
        <Icon name={icon} size={20} color={colors.textSecondary} />
        <Typography style={[styles.editLabel, { color: colors.text }]}>
          {label}
        </Typography>
      </View>

      <View style={styles.editRowRight}>
        <Typography
          style={[styles.editValue, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {value}
        </Typography>
        <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const getFieldConfig = (field: EditField) => {
    switch (field) {
      case "name":
        return {
          title: "Name",
          value: profileData.name,
          placeholder: "Enter your name",
          maxLength: 50,
          icon: "person-outline",
        };

      case "username":
        return {
          title: "Username",
          value: profileData.username,
          placeholder: "Enter username",
          maxLength: 30,
          icon: "at-outline",
        };

      case "bio":
        return {
          title: "Bio",
          value: profileData.bio,
          placeholder: "Tell us about yourself",
          maxLength: 150,
          multiline: true,
          icon: "information-circle-outline",
        };

      case "phone":
        return {
          title: "Phone Number",
          value: profileData.phone,
          placeholder: "Enter phone number",
          maxLength: 15,
          keyboardType: "phone-pad" as const,
          icon: "call-outline",
        };

      default:
        return null;
    }
  };

  const fieldConfig = editingField ? getFieldConfig(editingField) : null;

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: spacing.lg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Typography style={[styles.headerTitle, { color: colors.text }]}>
            Edit Profile
          </Typography>

          <TouchableOpacity onPress={handleSave}>
            {loadingUser ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Typography style={{ color: colors.primary, fontWeight: "600" }}>
                Save
              </Typography>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <Image
                source={{
                  uri:
                    profile?.profilePhoto ||
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                }}
                style={styles.avatar}
              />

              <TouchableOpacity
                style={[
                  styles.editAvatarButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleChangeAvatar}
              >
                <Icon name="pencil" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* About Section */}
            <View style={styles.aboutSection}>
              <Typography
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                About You
              </Typography>

              {renderEditRow("person-outline", "Name", profileData.name, "name")}
              {renderEditRow(
                "at-outline",
                "Username",
                `@${profileData.username}`,
                "username"
              )}
              {renderEditRow(
                "information-circle-outline",
                "Bio",
                profileData.bio,
                "bio"
              )}
              {renderEditRow(
                "call-outline",
                "Phone No",
                profileData.phone,
                "phone",
                true
              )}
            </View>

            {/* Logout */}
            <View style={styles.logoutContainer}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() =>
                  Alert.alert("Logout", "Are you sure you want to logout?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Logout",
                      style: "destructive",
                      onPress: async () => {
                        await logout();
                        navigation.replace("AuthStack" as never);
                      },
                    },
                  ])
                }
              >
                <Icon name="log-out-outline" size={20} color="#fff" />
                <Typography style={styles.logoutText}>Logout</Typography>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Modal */}
        {fieldConfig && (
          <EditFieldModal
            visible={editingField !== null}
            onClose={() => setEditingField(null)}
            onSave={(value) => handleFieldSave(editingField, value)}
            title={fieldConfig.title}
            value={fieldConfig.value}
            placeholder={fieldConfig.placeholder}
            maxLength={fieldConfig.maxLength}
            keyboardType={fieldConfig.keyboardType}
            multiline={fieldConfig.multiline}
            icon={fieldConfig.icon}
          />
        )}
      </View>
    </Screen>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  headerTitle: {
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    fontSize: 20,
  },

  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },

  card: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },

  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: "38%",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },

  aboutSection: {
    gap: 8,
  },

  sectionTitle: {
    fontWeight: "700",
    marginBottom: 16,
    fontSize: 16,
  },

  editRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },

  lastRow: {
    borderBottomWidth: 0,
  },

  editRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  editRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "60%",
  },

  editLabel: {
    fontWeight: "500",
    fontSize: 14,
  },

  editValue: {
    fontWeight: "400",
    fontSize: 14,
  },

  logoutContainer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 20,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E63946",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});