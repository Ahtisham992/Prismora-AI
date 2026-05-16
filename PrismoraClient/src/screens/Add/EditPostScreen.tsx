// screens/Add/EditPostScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import Video from "react-native-video";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AddStackParamList } from "../../navigation/stacks/AddStack";
import { Screen } from "../../components/layout/Screen";
import { useTheme } from "../../hooks/useTheme";
import Ionicons from "react-native-vector-icons/Ionicons";
import Slider from "@react-native-community/slider";
import LinearGradient from "react-native-linear-gradient";

const { height } = Dimensions.get("window");
const VIDEO_PREVIEW_HEIGHT = height * 0.45;

const FILTERS = [
  { id: "none", name: "Original", icon: "image-outline" },
  { id: "vivid", name: "Vivid", icon: "contrast-outline" },
  { id: "warm", name: "Warm", icon: "sunny-outline" },
  { id: "cool", name: "Cool", icon: "snow-outline" },
  { id: "bw", name: "B&W", icon: "contrast" },
];

const SOUNDS = [
  { id: "none", name: "None", icon: "volume-mute-outline" },
  { id: "upbeat", name: "Upbeat", icon: "musical-notes-outline" },
  { id: "chill", name: "Chill", icon: "cafe-outline" },
  { id: "dramatic", name: "Dramatic", icon: "flash-outline" },
  { id: "ambient", name: "Ambient", icon: "planet-outline" },
];

const ANIMATIONS = [
  { id: "none", name: "None", icon: "square-outline" },
  { id: "fade", name: "Fade", icon: "radio-button-off-outline" },
  { id: "slide", name: "Slide", icon: "arrow-forward-outline" },
  { id: "zoom", name: "Zoom", icon: "expand-outline" },
  { id: "bounce", name: "Bounce", icon: "trending-up-outline" },
];

type EditPostScreenNavigationProp = NativeStackNavigationProp<
  AddStackParamList,
  "EditPostScreen"
>;
type EditPostScreenRouteProp = RouteProp<
  AddStackParamList,
  "EditPostScreen"
>;

const EditPostScreen = () => {
  const navigation = useNavigation<EditPostScreenNavigationProp>();
  const route = useRoute<EditPostScreenRouteProp>();
  const { colors, spacing, radius } = useTheme();

  /** 🎯 Incoming DTO from GeneratingScreen */
  const { videoData } = route.params;

  // console.log("📥 EditScreen received:", videoData);

  /** 🔧 Editable UI State */
  const [activeTab, setActiveTab] = useState<
    "trim" | "filter" | "sound" | "animation"
  >("trim");

  const [selectedFilter, setSelectedFilter] = useState("none");
  const [selectedSound, setSelectedSound] = useState("none");
  const [selectedAnimation, setSelectedAnimation] = useState("none");

  const [soundVolume, setSoundVolume] = useState(60);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);

  /** ▶️ Continue — Send to PostDetailsScreen */
  const handleNext = () => {
    navigation.navigate("PostDetailsScreen", {
      videoData: {
        ...videoData,
        filter: selectedFilter,
        sound: selectedSound,
        soundVolume,
        animation: selectedAnimation,
        trimStart,
        trimEnd,
      },
    });
  };

  /** 🎞 Render Video Preview */
  const renderVideoPreview = () => {
    return (
      <View style={styles.videoPreviewContainer}>
        <Video
          source={{ uri: videoData.url }}
          style={styles.videoPlayer}
          resizeMode="cover"
          paused={!isPlaying}
          repeat={true}
          poster={videoData.thumbnailUrl}
          posterResizeMode="cover"
        />

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.gradientOverlay}
        />

        {/* Play/Pause Overlay Button */}
        <TouchableOpacity
          style={styles.playOverlayButton}
          onPress={() => setIsPlaying(!isPlaying)}
          activeOpacity={0.8}
        >
          <View style={[styles.playIconCircle, { backgroundColor: isPlaying ? "rgba(0,0,0,0.3)" : colors.primary }]}>
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={36}
              color="#FFFFFF"
              style={{ marginLeft: isPlaying ? 0 : 4 }}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.durationContainer}>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={styles.durationText}>{videoData.duration}s</Text>
          </View>
        </View>
      </View>
    );
  };

  /** ✂️ Render Trim */
  const renderTrimSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Trim Video
      </Text>

      <Slider
        minimumValue={0}
        maximumValue={100}
        value={trimStart}
        onValueChange={setTrimStart}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />

      <Slider
        minimumValue={trimStart}
        maximumValue={100}
        value={trimEnd}
        onValueChange={setTrimEnd}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />

      <Text style={{ color: colors.textSecondary }}>
        Start: {trimStart.toFixed(0)}% — End: {trimEnd.toFixed(0)}%
      </Text>
    </View>
  );

  /** 🎨 Render Filters */
  const renderFilterSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Filters
      </Text>

      <ScrollView horizontal>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.optionCard,
              {
                borderColor: selectedFilter === f.id ? colors.primary : "transparent",
              },
            ]}
            onPress={() => setSelectedFilter(f.id)}
          >
            <Ionicons
              name={f.icon as any}
              size={28}
              color={selectedFilter === f.id ? colors.primary : colors.text}
            />
            <Text style={{ color: colors.text }}>{f.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  /** 🔊 Render Sound */
  const renderSoundSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Sound</Text>

      <ScrollView horizontal>
        {SOUNDS.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[
              styles.optionCard,
              {
                borderColor: selectedSound === s.id ? colors.primary : "transparent",
              },
            ]}
            onPress={() => setSelectedSound(s.id)}
          >
            <Ionicons
              name={s.icon as any}
              size={28}
              color={selectedSound === s.id ? colors.primary : colors.text}
            />
            <Text style={{ color: colors.text }}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedSound !== "none" && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Volume: {soundVolume}%
          </Text>
          <Slider
            minimumValue={0}
            maximumValue={100}
            value={soundVolume}
            onValueChange={setSoundVolume}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
        </>
      )}
    </View>
  );

  /** ✨ Render Animation */
  const renderAnimationSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Animation
      </Text>

      <ScrollView horizontal>
        {ANIMATIONS.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[
              styles.optionCard,
              {
                borderColor:
                  selectedAnimation === a.id ? colors.primary : "transparent",
              },
            ]}
            onPress={() => setSelectedAnimation(a.id)}
          >
            <Ionicons
              name={a.icon as any}
              size={28}
              color={selectedAnimation === a.id ? colors.primary : colors.text}
            />
            <Text style={{ color: colors.text }}>{a.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Screen padding={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Edit Video
          </Text>

          <View style={{ width: 24 }} />
        </View>

        {/* Preview */}
        {renderVideoPreview()}

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { key: "trim", label: "Trim" },
            { key: "filter", label: "Filter" },
            { key: "sound", label: "Sound" },
            { key: "animation", label: "Animation" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              style={[
                styles.tab,
                {
                  borderBottomColor:
                    activeTab === tab.key ? colors.primary : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  color: activeTab === tab.key ? colors.primary : colors.text,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {activeTab === "trim" && renderTrimSection()}
          {activeTab === "filter" && renderFilterSection()}
          {activeTab === "sound" && renderSoundSection()}
          {activeTab === "animation" && renderAnimationSection()}
        </ScrollView>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={handleNext}
        >
          <Text style={[styles.continueText, { color: colors.onPrimary }]}>
            Continue
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },

  /** Video Preview */
  videoPreviewContainer: {
    height: VIDEO_PREVIEW_HEIGHT,
    marginHorizontal: 16,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#111", // Darker background behind video
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    height: "50%",
    width: "100%",
  },
  playOverlayButton: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  durationContainer: {
    position: "absolute",
    bottom: 10,
    right: 10,
  },
  durationBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  durationText: { color: "#fff", fontSize: 12 },

  /** Tabs */
  tabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 3,
  },

  /** Sections */
  section: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  /** Option Cards */
  optionCard: {
    width: 96,
    height: 105,
    marginRight: 14,
    borderWidth: 2,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.02)",
  },

  /** Bottom Button */
  continueButton: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 18,
    marginHorizontal: 20,
    marginBottom: Platform.OS === "ios" ? 30 : 20,
    borderRadius: 30,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  continueText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});

export default EditPostScreen;
