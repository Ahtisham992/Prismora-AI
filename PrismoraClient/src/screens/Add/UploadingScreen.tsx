// screens/Add/UploadingScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddStackParamList } from '../../navigation/stacks/AddStack';
import { Screen } from '../../components/layout/Screen';
import { Loader } from '../../components/atoms/Loader';
import { useTheme } from '../../hooks/useTheme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { postsService } from '../../services/postsService';

type UploadingScreenNavigationProp = NativeStackNavigationProp<
  AddStackParamList,
  'UploadingScreen'
>;
type UploadingScreenRouteProp = RouteProp<AddStackParamList, 'UploadingScreen'>;

const UploadingScreen = () => {
  const navigation = useNavigation<UploadingScreenNavigationProp>();
  const route = useRoute<UploadingScreenRouteProp>();
  const { colors, spacing, radius } = useTheme();

  /** 🎯 Final data from PostDetailsScreen */
  const { postData } = route.params;

  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Uploading post...');

  /** ---------------------------------------------------------
   * 🛠 Convert Data for Backend DTO
   * -------------------------------------------------------- */
  const payload = {
    videoUrl: postData.url,
    thumbnailUrl: postData.thumbnailUrl,
    title: postData.title,
    description: postData.description,
    duration: Number(postData.duration.replace("m", "")) * 60,
    summary:postData.summary,
    categories:postData.tags
    
   
  };
  console.log("postData",postData);
  console.log("Payload",payload);

  /** ---------------------------------------------------------
   * 🚀 Upload the Post to Backend
   * -------------------------------------------------------- */
  const uploadPost = async () => {
    try {
      setStatusMessage('Finalizing upload...');

      console.log('📤 Uploading DTO:', payload);

      await postsService.createPost(payload);

      console.log('🎉 Post saved successfully!');

      setStatusMessage('Post uploaded successfully!');

      // Navigate to Home tab and reset Add stack
        navigation.navigate("AddScreen");
    } catch (err: any) {
      console.log('❌ Upload error:', err?.response || err);

      Alert.alert(
        'Upload Failed',
        err?.response?.data?.message ||
          'Unable to upload your post. Try again.',
      );

      navigation.goBack();
    }
  };

  /** ---------------------------------------------------------
   * ⏳ Animate Progress + Trigger Upload
   * -------------------------------------------------------- */
  useEffect(() => {
    const steps = [
      'Uploading video...',
      'Processing filters...',
      'Adding background audio...',
      'Optimizing playback...',
      'Finalizing post...',
    ];

    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % steps.length;
      setStatusMessage(steps[msgIndex]);
    }, 1000);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(msgInterval);

          uploadPost(); // ← Call backend API at the end
          return 100;
        }
        return prev + 2;
      });
    }, 80);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <Screen>
      <View style={styles.container}>
        {/* Thumbnail */}
        <View
          style={[
            styles.videoPreview,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              marginBottom: spacing.xl,
            },
          ]}
        >
          <Image
            source={{ uri: postData.thumbnailUrl }}
            style={[styles.videoThumbnail, { borderRadius: radius.md }]}
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Uploading Your Post
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: colors.textSecondary, marginTop: spacing.sm },
          ]}
        >
          {statusMessage}
        </Text>

        <View style={[styles.loaderContainer, { marginTop: spacing.lg }]}>
          <Loader size="large" />
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { marginTop: spacing.lg }]}>
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
            {Math.round(progress)}%
          </Text>
        </View>

        {/* Quick Post Summary */}
        <View style={[styles.postInfo, { marginTop: spacing.xl }]}>
          <View style={styles.infoRow}>
            <Ionicons
              name="text-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text
              numberOfLines={2}
              style={[styles.infoText, { color: colors.textSecondary }]}
            >
              {postData.description || 'No caption added'}
            </Text>
          </View>

          {postData.hashtags?.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons
                name="pricetag-outline"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {postData.hashtags.length} hashtags
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons
              name={
                postData.visibility === 'public'
                  ? 'globe-outline'
                  : postData.visibility === 'followers'
                  ? 'people-outline'
                  : 'lock-closed-outline'
              }
              size={20}
              color={colors.textSecondary}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {postData.visibility.charAt(0).toUpperCase() +
                postData.visibility.slice(1)}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.bottomText,
            { color: colors.textSecondary, marginTop: 'auto' },
          ]}
        >
          Please don’t close the app while uploading…
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, alignItems: 'center' },
  videoPreview: { width: 120, height: 180, overflow: 'hidden' },
  videoThumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 16 },
  loaderContainer: { padding: 20 },
  progressContainer: { width: '100%', alignItems: 'center' },
  progressBarBackground: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 16, fontWeight: '600' },
  postInfo: { width: '100%', gap: 12, paddingHorizontal: 20 },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 14 },
  bottomText: { fontSize: 14, marginBottom: 40, textAlign: 'center' },
});

export default UploadingScreen;
