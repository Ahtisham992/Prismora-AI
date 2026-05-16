// screens/Add/CreatePostUploadOptions.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddStackParamList } from '../../navigation/stacks/AddStack';
import { Screen } from '../../components/layout/Screen';
import { useTheme } from '../../hooks/useTheme';
import Ionicons  from 'react-native-vector-icons/Ionicons';

type CreatePostUploadOptionsNavigationProp = NativeStackNavigationProp<AddStackParamList, 'CreatePostUploadOptions'>;

const CreatePostUploadOptions = () => {
  const navigation = useNavigation<CreatePostUploadOptionsNavigationProp>();
  const { colors, spacing, radius } = useTheme();

  const handleUploadFromURL = () => {
    navigation.navigate('CreatePostURL');
  };

  const handleUploadFile = () => {
    navigation.navigate('CreatePostFile');
  };

  const handleViewDrafts = () => {
    // Navigate to drafts screen
    console.log('View Drafts');
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
        {/* Upload Podcast Button */}
        <TouchableOpacity
          style={[
            styles.optionButton,
            { 
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              marginBottom: spacing.md 
            }
          ]}
          onPress={handleUploadFromURL}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="mic" size={24} color={colors.onPrimary} />
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonTitle, { color: colors.onPrimary }]}>
                Upload Podcast
              </Text>
              <Text style={[styles.buttonSubtitle, { color: colors.onPrimary, opacity: 0.8 }]}>
                (From URL)
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Upload File Button */}
        <TouchableOpacity
          style={[
            styles.optionButton,
            { 
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              marginBottom: spacing.lg 
            }
          ]}
          onPress={handleUploadFile}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="folder-open" size={24} color={colors.onPrimary} />
            <View style={styles.buttonTextContainer}>
              <Text style={[styles.buttonTitle, { color: colors.onPrimary }]}>
                Upload File
              </Text>
              <Text style={[styles.buttonSubtitle, { color: colors.onPrimary, opacity: 0.8 }]}>
                (Mp3/Mp4)
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* View Drafts Link */}
        <TouchableOpacity onPress={handleViewDrafts}>
          <Text style={[styles.draftsLink, { color: colors.text }]}>
            View Drafts
          </Text>
        </TouchableOpacity>
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
  optionButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonTextContainer: {
    marginLeft: 16,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  draftsLink: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CreatePostUploadOptions;