// screens/Add/PreUploadScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import Video from 'react-native-video';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddStackParamList } from '../../navigation/stacks/AddStack';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/atoms/Button';
import { useTheme } from '../../hooks/useTheme';
import Ionicons from 'react-native-vector-icons/Ionicons';

type PreUploadScreenNavigationProp = NativeStackNavigationProp<
  AddStackParamList,
  'PreUploadScreen'
>;

type PreUploadScreenRouteProp = RouteProp<
  AddStackParamList,
  'PreUploadScreen'
>;

const VISIBILITY_OPTIONS = [
  { label: 'Public', value: 'public', icon: 'globe-outline' },
  { label: 'Followers', value: 'followers', icon: 'people-outline' },
  { label: 'Private', value: 'private', icon: 'lock-closed-outline' },
];

const PreUploadScreen: React.FC = () => {
  const navigation = useNavigation<PreUploadScreenNavigationProp>();
  const route = useRoute<PreUploadScreenRouteProp>();
  const { colors, spacing, radius } = useTheme();

  const { postData } = route.params;

  const [title, setTitle] = useState(postData.title || '');
  const [description, setDescription] = useState(postData.description || '');
  const [visibility, setVisibility] = useState(postData.visibility || 'public');
  const [tags, setTags] = useState<string[]>(postData.tags || []);
  const [tagInput, setTagInput] = useState('');

  // 🔥 ONLY STATE WE KEEP (safe for Fabric)
  const [paused, setPaused] = useState(true);

  const videoRef = useRef<Video>(null);

  const MAX_TAGS = 5;
  const MAX_TAG_LENGTH = 25;

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;

    if (tags.length >= MAX_TAGS) {
      Alert.alert('Limit reached', `Max ${MAX_TAGS} tags allowed.`);
      return;
    }

    if (trimmed.length > MAX_TAG_LENGTH) {
      Alert.alert('Too long', `Max ${MAX_TAG_LENGTH} characters.`);
      return;
    }

    if (tags.includes(trimmed)) {
      Alert.alert('Duplicate tag');
      return;
    }

    setTags([...tags, trimmed]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handlePublish = () => {
    if (!title.trim()) return Alert.alert('Missing title');
    if (!description.trim()) return Alert.alert('Missing description');

    navigation.navigate('UploadingScreen', {
      postData: {
        ...postData,
        title: title.trim(),
        description: description.trim(),
        tags,
      },
    });
  };

  return (
    <Screen padding={false}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xl,
        }}
      >
        {/* Header */}
        <View style={[styles.header, { marginBottom: spacing.lg, marginTop: spacing.md }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Review & Edit
          </Text>
        </View>

        {/* 🔥 STABLE VIDEO CONTAINER (NO UNMOUNTING EVER) */}
        <View
          style={[
            styles.videoContainer,
            { borderRadius: radius.md, marginBottom: spacing.lg },
          ]}
        >
          {/* VIDEO ALWAYS MOUNTED (CRITICAL FIX) */}
          <Video
            ref={videoRef}
            source={{ uri: postData.url }}
            style={styles.video}
            paused={paused}
            repeat
            resizeMode="contain"
            onError={(e) => console.log('Video error:', e)}
          />

          {/* Thumbnail overlay (SAFE LAYER, NOT REPLACING VIDEO) */}
          {paused && (
            <Image
              source={{ uri: postData.thumbnailUrl }}
              style={styles.overlay}
              resizeMode="cover"
            />
          )}

          {/* Play/Pause */}
          <TouchableOpacity
            style={[styles.playPauseButton, { backgroundColor: colors.surface + 'cc' }]}
            onPress={() => setPaused(p => !p)}
          >
            <Ionicons
              name={paused ? 'play' : 'pause'}
              size={32}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* FORM */}
        <View style={styles.form}>
          {/* Title */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter title"
              placeholderTextColor={colors.placeholder}
            />
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              Description *
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description"
              placeholderTextColor={colors.placeholder}
              multiline
            />
          </View>

          {/* Tags */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              Tags (max {MAX_TAGS})
            </Text>

            <View style={styles.tagInputRow}>
              <TextInput
                style={[
                  styles.tagInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add tag"
                placeholderTextColor={colors.placeholder}
              />

              <TouchableOpacity
                style={[styles.addTagButton, { backgroundColor: colors.primary }]}
                onPress={handleAddTag}
              >
                <Ionicons name="add" size={20} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.tagsContainer}>
              {tags.map(tag => (
                <View
                  key={tag}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: colors.primary + '20',
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.tagText, { color: colors.primary }]}>
                    {tag}
                  </Text>

                  <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                    <Ionicons name="close-circle" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Visibility */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Visibility</Text>

            <View style={styles.visibilityOptions}>
              {VISIBILITY_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.visibilityOption,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                    visibility === option.value && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '10',
                    },
                  ]}
                  onPress={() => setVisibility(option.value)}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={
                      visibility === option.value
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.visibilityText,
                      {
                        color:
                          visibility === option.value
                            ? colors.primary
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button title="Publish Now" onPress={handlePublish} />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },

  video: {
    ...StyleSheet.absoluteFillObject,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
  },

  playPauseButton: {
    position: 'absolute',
    padding: 14,
    borderRadius: 50,
  },

  form: {
    gap: 20,
  },

  fieldContainer: {
    gap: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },

  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  addTagButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },

  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },

  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },

  visibilityOptions: {
    flexDirection: 'row',
    gap: 12,
  },

  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },

  visibilityText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PreUploadScreen;