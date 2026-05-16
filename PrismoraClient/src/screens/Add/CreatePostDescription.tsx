// screens/Add/CreatePostDescription.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddStackParamList } from '../../navigation/stacks/AddStack';
import { Screen } from '../../components/layout/Screen';
import { Input } from '../../components/atoms/Input';
import { Button } from '../../components/atoms/Button';
import { useTheme } from '../../hooks/useTheme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const DURATION_OPTIONS = [
  { key: '1 min', value: '1m' },
  { key: '3 min', value: '3m' },
  { key: '5 min', value: '5m' },
  { key: '10 min', value: '10m' },
];

type NavigationProp = NativeStackNavigationProp<
  AddStackParamList,
  'CreatePostDescription'
>;

type RouteProps = RouteProp<
  AddStackParamList,
  'CreatePostDescription'
>;

const CreatePostDescription = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors, spacing, radius } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState('General');
  const [duration, setDuration] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  useEffect(() => {
    if (route.params?.metadata) {
      const { title, description, tags, thumbnail } =
        route.params.metadata;

      setTitle(title || '');
      setDescription(description || '');
      setTags(Array.isArray(tags) ? tags.slice(0, 5) : []);
      setThumbnail(thumbnail || null);
    }
  }, [route.params]);

  const selectDuration = (value: string) => {
    setDuration(value);
    setShowDurationPicker(false);
  };

  const handleGenerate = () => {
    if (!title.trim() || !description.trim() || !duration) return;

    navigation.navigate('ProcessingScreen', {
      podcastData: {
        title,
        description,
        thumbnail,
        tags,
        category,
        duration,
        suggestion,
        source: route.params.source,
        url: route.params.url,
        file: route.params.file,
      },
    });
  };

  const isDisabled = !title.trim() || !description.trim() || !duration;

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
        <View style={[styles.header, { marginBottom: spacing.lg }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Podcast Description
          </Text>
        </View>

        {/* Thumbnail */}
        <View
          style={[
            styles.thumbnailContainer,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <Image
            source={thumbnail ? { uri: thumbnail } : undefined}
            style={[styles.thumbnail, { borderRadius: radius.md }]}
            resizeMode="cover"
          />
        </View>

        {/* FORM */}
        <View style={styles.form}>
          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Title
            </Text>
            <Input value={title} onChangeText={setTitle} />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Description
            </Text>
            <Input
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={styles.textArea}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Category
            </Text>
            <Input value={category} onChangeText={setCategory} />
          </View>

          {/* Duration */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Select Duration
            </Text>

            <TouchableOpacity
              onPress={() => setShowDurationPicker(true)}
              style={[
                styles.durationBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={{ color: colors.text }}>
                {duration || 'Select duration'}
              </Text>

              <Ionicons
                name="chevron-down"
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          {/* Suggestion */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Suggestion
            </Text>
            <Input
              value={suggestion}
              onChangeText={setSuggestion}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* BUTTON (DISABLED UNTIL READY) */}
          <Button
            title="+ Generate Transcript & Highlights"
            onPress={handleGenerate}
            disabled={isDisabled}
            style={{
              marginTop: spacing.lg,
              opacity: isDisabled ? 0.5 : 1,
            }}
          />
        </View>
      </ScrollView>

      {/* MODAL */}
      <Modal
        visible={showDurationPicker}
        transparent
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDurationPicker(false)}
        >
          <View
            style={[
              styles.modalBox,
              { backgroundColor: '#fff' },
            ]}
          >
            {DURATION_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={styles.option}
                onPress={() => selectDuration(option.value)}
              >
                <Text style={styles.optionText}>
                  {option.key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
};

export default CreatePostDescription;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },

  header: {
    marginTop: 20,
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

  thumbnailContainer: {
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },

  thumbnail: {
    width: '100%',
    height: '100%',
  },

  form: {
    gap: 16,
  },

  field: {
    gap: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: '500',
  },

  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  durationBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalBox: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },

  option: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },

  optionText: {
    fontSize: 16,
    textAlign: 'center',
  },
});