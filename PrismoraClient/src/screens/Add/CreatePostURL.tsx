// screens/Add/CreatePostURL.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddStackParamList } from '../../navigation/stacks/AddStack';
import { Screen } from '../../components/layout/Screen';
import { Input } from '../../components/atoms/Input';
import { Button } from '../../components/atoms/Button';
import { useTheme } from '../../hooks/useTheme';
import Ionicons from 'react-native-vector-icons/Ionicons';

// ⭐ AI SERVICE IMPORT
import { aiService } from '../../services/aiService';

type CreatePostURLNavigationProp = NativeStackNavigationProp<
  AddStackParamList,
  'CreatePostURL'
>;

const CreatePostURL = () => {
  const navigation = useNavigation<CreatePostURLNavigationProp>();
  const { colors, spacing, radius } = useTheme();
  
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFetchPodcast = async () => {
    if (!url.trim()) return;

    try {
      setLoading(true);

      // ── Step 1: Content validation (runs before anything expensive) ────
      setProgress('Checking if this is a podcast...');
      const validationRes = await aiService.validatePodcast({ youtube_url: url });
      const validation = validationRes.data;

      if (!validation.is_valid) {
        setLoading(false);
        Alert.alert(
          '🎵 Not Supported',
          validation.reason ||
            'This video does not appear to be a podcast or talk-based content. ' +
            'Please provide a podcast, interview, lecture, or documentary URL.',
          [{ text: 'OK' }],
        );
        return; // stop — do not proceed to extractInfo
      }

      // ── Step 2: Extract metadata (only reached if validation passed) ───
      setProgress('Extracting video metadata...');
      const response = await aiService.extractInfo({ youtube_url: url });
      const info = response.data;

      // { thumbnailSrc, title, description, tags }

      setProgress('Preparing editor...');

      // ⏭ Navigate to Next Screen with Extracted Data
      navigation.navigate('CreatePostDescription', {
        source: 'url',
        url: url,
        metadata: {
          thumbnail: info.thumbnailSrc,
          title: info.title,
          description: info.description,
          tags: info.tags || [],
        },
      });

      setLoading(false);
    } catch (err: any) {
      console.log(err);
      setLoading(false);
      Alert.alert(
        'Unable to Fetch Data',
        err?.response?.data?.message || 'Something went wrong while extracting info.'
      );
    }
  };


  return (
    <Screen>
      {/* Header */}
      <View style={[styles.header, { marginBottom: spacing.xl }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Create a New{'\n'}Podcast Short.
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderColor: colors.border,
              padding: spacing.md,
            },
          ]}
        >
          <Text
            style={[
              styles.label,
              { color: colors.text, marginBottom: spacing.sm },
            ]}
          >
            Enter Youtube or Podcast URL
          </Text>

          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            style={styles.input}
          />

          <Button
            title="Fetch Podcast"
            onPress={handleFetchPodcast}
            disabled={!url.trim() || loading}
            loading={loading}
            style={{ marginTop: spacing.md }}
          />

          {loading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressDots}>
                <View
                  style={[
                    styles.dot,
                    styles.dotActive,
                    { backgroundColor: colors.primary },
                  ]}
                />
                <View
                  style={[styles.dot, { backgroundColor: colors.border }]}
                />
                <View
                  style={[styles.dot, { backgroundColor: colors.border }]}
                />
              </View>
              <Text
                style={[
                  styles.progressText,
                  { color: colors.textSecondary },
                ]}
              >
                {progress}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  content: {
    flex: 1,
  },
  inputContainer: {
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  progressText: {
    fontSize: 12,
  },
});

export default CreatePostURL;
