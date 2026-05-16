import React, { useEffect, useCallback, useState } from 'react';
import { View, Alert, ActivityIndicator, Text } from 'react-native';
import IMGLYEditor, {
  EditorPreset,
  EditorSettingsModel,
  SourceType,
} from '@imgly/editor-react-native';
import { utilityService } from '../../services/utilityService';

const VideoEditor = ({
  videos,
  license,
  userId = 'demo_user',
  onFinish,
}) => {
  const [loadingText, setLoadingText] = useState('Opening editor...');

  const openEditor = useCallback(async () => {
    console.log("Video: ", videos);

    if (!videos?.length) {
      Alert.alert('No videos', 'Please provide at least one video URL.');
      onFinish?.({ result: null, error: 'No videos' });
      return;
    }

    try {
      setLoadingText('Opening editor...');

      const result = await IMGLYEditor.openEditor(
        new EditorSettingsModel({
          license: license ?? null,
          userId,
          ui: {
            elements: {
              'toolbar/export': { visible: true },
            },
          },
        }),
        {
          source: videos,
          type: SourceType.VIDEO,
        },
        EditorPreset.VIDEO,
      );

      const localVideo = result?.artifact;

      console.log('📁 Local video:', localVideo);

      if (!localVideo) {
        throw new Error('No exported video found');
      }

      setLoadingText('Uploading video...');

      // 🔥 now returns URL directly
      const cloudUrl = await utilityService.uploadVideo({
        uri: localVideo,
      });

      console.log('☁️ Cloud URL:', cloudUrl);

      onFinish?.({
        result: {
          ...result,
          url: cloudUrl,
        },
        error: null,
      });

    } catch (error) {
      // console.error('Editor error:', error);
      onFinish?.({ result: null, error });
    }
  }, [videos, license, userId, onFinish]);

  useEffect(() => {
    openEditor();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text>{loadingText}</Text>
    </View>
  );
};

export default VideoEditor;