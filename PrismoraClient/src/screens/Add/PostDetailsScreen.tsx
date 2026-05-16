// screens/Add/PostDetailsScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput as RNTextInput,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AddStackParamList } from "../../navigation/stacks/AddStack";
import { Screen } from "../../components/layout/Screen";
import { Input } from "../../components/atoms/Input";
import { Button } from "../../components/atoms/Button";
import { useTheme } from "../../hooks/useTheme";
import Ionicons from "react-native-vector-icons/Ionicons";

type PostDetailsScreenNavigationProp = NativeStackNavigationProp<
  AddStackParamList,
  "PostDetailsScreen"
>;

type PostDetailsScreenRouteProp = RouteProp<
  AddStackParamList,
  "PostDetailsScreen"
>;

const VISIBILITY_OPTIONS = [
  { id: "public", label: "Public", icon: "globe-outline", description: "Everyone can see" },
  { id: "followers", label: "Followers", icon: "people-outline", description: "Only followers" },
  { id: "private", label: "Private", icon: "lock-closed-outline", description: "Only you" },
];

const PostDetailsScreen = () => {
  const navigation = useNavigation<PostDetailsScreenNavigationProp>();
  const route = useRoute<PostDetailsScreenRouteProp>();
  const { colors, spacing, radius } = useTheme();

  /** 🔥 Incoming final composed data from EditPostScreen */
  const { videoData } = route.params;

  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  /** ✨ Auto-generate initial caption */
  useEffect(() => {
    generateAICaption();
  }, []);

  const generateAICaption = () => {
    setIsGeneratingCaption(true);

    setTimeout(() => {
      setCaption(
        `✨ Highlight from "${videoData.title}" 🎧\n\nEnjoy this powerful moment! 🔥`
      );
      setHashtags(["motivation", "podcast", "AIClip", "viral"]);
      setIsGeneratingCaption(false);
    }, 1200);
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace("#", "");
    if (!tag || hashtags.includes(tag)) return;
    setHashtags([...hashtags, tag]);
    setHashtagInput("");
  };

  const removeHashtag = (tag: string) =>
    setHashtags(hashtags.filter((t) => t !== tag));

  /** ▶️ Final Post → Upload Screen */
  const handlePost = () => {
    const payload = {
      ...videoData,

      /** Required DTO fields for backend */
      videoUrl: videoData.url,
      thumbnailUrl: videoData.thumbnailUrl,
      title: videoData.title,
      description: caption,
      duration: videoData.duration,
      podcastName: (videoData as any).podcastName,
      episodeNumber: (videoData as any).episodeNumber,

      /** Optional metadata */
      hashtags,
      visibility,
      filter: videoData.filter,
      sound: videoData.sound,
      soundVolume: videoData.soundVolume,
      animation: videoData.animation,
      trimStart: videoData.trimStart,
      trimEnd: videoData.trimEnd,
    };

    navigation.navigate("UploadingScreen", { postData: payload });
  };

  const selectedVisibility = VISIBILITY_OPTIONS.find(
    (v) => v.id === visibility
  );

  return (
    <Screen padding={false}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xl,
        }}
      >
        {/* Header */}
        <View style={[styles.header, { marginBottom: spacing.lg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Post Details
          </Text>

          <View style={{ width: 24 }} />
        </View>

        {/* Video Preview */}
        <View
          style={[
            styles.videoPreview,
            { backgroundColor: colors.surface, borderRadius: radius.md },
          ]}
        >
          <Image
            source={{ uri: videoData.thumbnailUrl }}
            style={[styles.thumbnail, { borderRadius: radius.md }]}
          />
          <View style={styles.overlay}>
            <Ionicons name="play-circle" size={48} color="#fff" />
          </View>
        </View>

        {/* Caption */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Caption
            </Text>

            <TouchableOpacity
              onPress={generateAICaption}
              disabled={isGeneratingCaption}
              style={[
                styles.aiButton,
                { backgroundColor: colors.primary, borderRadius: radius.pill },
              ]}
            >
              <Ionicons name="sparkles" size={14} color={colors.onPrimary} />
              <Text style={[styles.aiButtonText, { color: colors.onPrimary }]}>
                {isGeneratingCaption ? "Generating..." : "Auto Generate"}
              </Text>
            </TouchableOpacity>
          </View>

          <RNTextInput
            style={[
              styles.captionInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            multiline
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption..."
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {caption.length}/500
          </Text>
        </View>

        {/* Hashtags */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Hashtags
          </Text>

          <View style={styles.hashtagInputRow}>
            <Input
              value={hashtagInput}
              onChangeText={setHashtagInput}
              placeholder="Add hashtag"
              style={{ flex: 1 }}
            />
            <TouchableOpacity
              onPress={addHashtag}
              style={[
                styles.addHashtagBtn,
                { backgroundColor: colors.primary, borderRadius: radius.sm },
              ]}
            >
              <Ionicons name="add" size={22} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.hashtagList}>
            {hashtags.map((h, idx) => (
              <View
                key={idx}
                style={[
                  styles.hashtagTag,
                  { backgroundColor: colors.primary, borderRadius: radius.pill },
                ]}
              >
                <Text style={{ color: colors.onPrimary }}>#{h}</Text>
                <TouchableOpacity onPress={() => removeHashtag(h)}>
                  <Ionicons name="close-circle" size={16} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Visibility */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Visibility
          </Text>

          <TouchableOpacity
            onPress={() => setShowVisibilityModal(true)}
            style={[
              styles.visibilityButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.sm,
              },
            ]}
          >
            <View style={styles.visibilityLeft}>
              <Ionicons
                name={selectedVisibility?.icon as any}
                size={20}
                color={colors.text}
              />
              <View>
                <Text style={[styles.visibilityLabel, { color: colors.text }]}>
                  {selectedVisibility?.label}
                </Text>
                <Text
                  style={[styles.visibilityDescription, { color: colors.textSecondary }]}
                >
                  {selectedVisibility?.description}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Post Button */}
        <Button title="Post" onPress={handlePost} />

        <Button
          title="Save as Draft"
          variant="secondary"
          style={[{ marginTop: spacing.md }]}
          onPress={() => navigation.goBack()}
        />
      </ScrollView>

      {/* Visibility Modal */}
      <Modal transparent visible={showVisibilityModal} animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVisibilityModal(false)}
        >
          <View
            style={[
              styles.modalBox,
              { backgroundColor: colors.surface, borderRadius: radius.md },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Who can see this?
            </Text>

            {VISIBILITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.modalItem}
                onPress={() => {
                  setVisibility(option.id);
                  setShowVisibilityModal(false);
                }}
              >
                <View style={styles.modalItemLeft}>
                  <Ionicons
                    name={option.icon as any}
                    size={22}
                    color={colors.text}
                  />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={[styles.modalItemLabel, { color: colors.text }]}>
                      {option.label}
                    </Text>
                    <Text
                      style={[styles.modalItemDescription, { color: colors.textSecondary }]}
                    >
                      {option.description}
                    </Text>
                  </View>
                </View>

                {visibility === option.id && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },

  videoPreview: { height: 300, marginBottom: 20 },
  thumbnail: { width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontSize: 16, fontWeight: "700" },

  aiButton: { paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", gap: 6 },
  aiButtonText: { fontSize: 12, fontWeight: "600" },

  captionInput: { padding: 12, borderWidth: 1, minHeight: 100, borderRadius: 8 },
  charCount: { marginTop: 6, fontSize: 12, textAlign: "right" },

  hashtagInputRow: { flexDirection: "row", marginTop: 6, gap: 10 },
  addHashtagBtn: {
    width: 46,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
  },
  hashtagList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  hashtagTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },

  visibilityButton: {
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  visibilityLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  visibilityLabel: { fontSize: 16, fontWeight: "600" },
  visibilityDescription: { fontSize: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: { padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    alignItems: "center",
  },
  modalItemLeft: { flexDirection: "row", alignItems: "center" },
  modalItemLabel: { fontSize: 16, fontWeight: "600" },
  modalItemDescription: { fontSize: 12 },
});

export default PostDetailsScreen;
