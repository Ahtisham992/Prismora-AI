// screens/Add/CreatePostFile.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddStackParamList } from '../../navigation/stacks/AddStack';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/atoms/Button';
import { useTheme } from '../../hooks/useTheme';
import Ionicons  from 'react-native-vector-icons/Ionicons';
// TODO: Re-enable when DocumentPicker is fixed
// import { DocumentPicker, DocumentPickerResponse } from '@react-native-documents/picker';

type CreatePostFileNavigationProp = NativeStackNavigationProp<AddStackParamList, 'CreatePostFile'>;

const CreatePostFile = () => {
  const navigation = useNavigation<CreatePostFileNavigationProp>();
  const { colors, spacing, radius } = useTheme();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handlePickFile = async () => {
    // TODO: Re-enable when DocumentPicker is fixed
    Alert.alert('Coming Soon', 'File upload feature will be available in the next update');
    
    /* 
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio, DocumentPicker.types.video],
        copyTo: 'cachesDirectory',
      });

      if (result && result.length > 0) {
        setSelectedFile(result[0]);
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        // User cancelled the picker
        console.log('User cancelled file picker');
      } else {
        Alert.alert('Error', 'Failed to pick file');
      }
    }
    */
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;

    setLoading(true);

    // Simulate upload
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('CreatePostDescription', {
        source: 'file',
        file: selectedFile,
      });
    }, 2000);
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
        <View style={[
          styles.uploadContainer,
          { 
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderColor: colors.border,
            padding: spacing.lg,
          }
        ]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="cloud-upload-outline" size={48} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Upload Podcast File
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select an MP3 or MP4 file from your device
          </Text>

          {selectedFile && (
            <View style={[
              styles.fileInfo,
              { 
                backgroundColor: colors.background,
                borderRadius: radius.sm,
                marginTop: spacing.md,
              }
            ]}>
              <Ionicons name="document" size={20} color={colors.primary} />
              <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                {selectedFile.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}

          <Button
            title={selectedFile ? "Change File" : "Select File"}
            onPress={handlePickFile}
            variant="secondary"
            style={{ 
              marginTop: spacing.lg,
              backgroundColor: colors.background,
            }}
          />

          {selectedFile && (
            <Button
              title="Upload & Continue"
              onPress={handleUploadFile}
              loading={loading}
              style={{ marginTop: spacing.md }}
            />
          )}
        </View>

        <Text style={[styles.supportText, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Supported formats: MP3, MP4, WAV{'\n'}
          Maximum file size: 500MB
        </Text>
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
  uploadContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    width: '100%',
  },
  fileName: {
    flex: 1,
    fontSize: 14,
  },
  supportText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default CreatePostFile;