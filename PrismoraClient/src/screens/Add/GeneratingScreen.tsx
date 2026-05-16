// screens/Add/GeneratingScreen.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AddStackParamList } from "../../navigation/stacks/AddStack";
import { Screen } from "../../components/layout/Screen";
import { Loader } from "../../components/atoms/Loader";
import { useTheme } from "../../hooks/useTheme";

type GeneratingScreenNavigationProp = NativeStackNavigationProp<
  AddStackParamList,
  "GeneratingScreen"
>;

type GeneratingScreenRouteProp = RouteProp<
  AddStackParamList,
  "GeneratingScreen"
>;

const GeneratingScreen = () => {
  const navigation = useNavigation<GeneratingScreenNavigationProp>();
  const route = useRoute<GeneratingScreenRouteProp>();
  const { colors, spacing, radius } = useTheme();

  /** 🔥 Incoming Data */
  const { highlightResult, podcastInfo } = route.params;

  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Preparing highlight...");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  /** 📌 Simulate Generation + Assign Video URL from backend */
  useEffect(() => {
    const messages = [
      "Preparing highlight...",
      "Processing content...",
      "Optimizing video...",
      "Finalizing short...",
      "Almost ready...",
    ];

    let msgIndex = 0;

    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setStatusMessage(messages[msgIndex]);
    }, 1500);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(msgInterval);
          clearInterval(progressInterval);

          // 👇 Extract video URL from backend highlight result
          setVideoUrl(podcastInfo.url);

          return 100;
        }
        return prev + 3;
      });
    }, 120);

    return () => {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
    };
  }, []);

  /** ▶️ Continue Button → Send DTO to Next Screen */
  const handleContinue = () => {
    if (!videoUrl) {
      return Alert.alert("Hold on", "Video is still generating...");
    }

    const dto = {
      id: Date.now().toString(),
      url: podcastInfo.url,
      thumbnailUrl: podcastInfo.thumbnailUrl,
      title: podcastInfo.title,
      duration: podcastInfo.duration || "0",
    };

    navigation.navigate("EditPostScreen", {
      videoData: dto,
    });
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          Generating Video
        </Text>

        {/* Subtitle */}
        <Text
          style={[
            styles.subtitle,
            { color: colors.textSecondary, marginTop: spacing.sm },
          ]}
        >
          {statusMessage}
        </Text>

        {/* Loader */}
        {progress < 100 ? (
          <View style={{ marginTop: spacing.xl }}>
            <Loader size="large" />
          </View>
        ) : (
          <View style={{ marginTop: spacing.xl, alignItems: "center" }}>
            <Text style={[styles.readyText, { color: colors.primary }]}>
              Video Ready! 🎉
            </Text>

            {/* Thumbnail */}
            <Image
              source={{ uri: podcastInfo.thumbnailUrl }}
              style={[styles.thumbnail, { borderRadius: radius.md }]}
            />

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: colors.primary, borderRadius: radius.md },
              ]}
              onPress={handleContinue}
            >
              <Text style={[styles.continueText, { color: colors.onPrimary }]}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { marginTop: spacing.xl }]}>
          <View
            style={[
              styles.progressBarBackground,
              { backgroundColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>

          <Text
            style={[
              styles.progressText,
              { color: colors.text, marginTop: spacing.sm },
            ]}
          >
            {progress}%
          </Text>
        </View>

        <Text
          style={[
            styles.infoText,
            { color: colors.textSecondary, textAlign: "center", marginTop: "auto" },
          ]}
        >
          Please do not close the app while generating the video.
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, alignItems: "center" },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 16, textAlign: "center" },
  readyText: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  thumbnail: {
    width: 260,
    height: 150,
    marginVertical: 20,
    backgroundColor: "#CCC",
  },
  continueButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  continueText: { fontSize: 16, fontWeight: "700" },
  progressContainer: { width: "100%", alignItems: "center" },
  progressBarBackground: {
    width: "80%",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 5 },
  progressText: { fontSize: 16, fontWeight: "600" },
  infoText: { fontSize: 14, marginBottom: 40 },
});

export default GeneratingScreen;
