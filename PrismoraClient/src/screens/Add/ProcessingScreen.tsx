import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddStackParamList } from '../../navigation/stacks/AddStack';
import { Screen } from '../../components/layout/Screen';
import { useTheme } from '../../hooks/useTheme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Switch } from '../../components/atoms/Switch';

import { aiService } from '../../services/aiService';

type ProcessingScreenNavigationProp = NativeStackNavigationProp<
  AddStackParamList,
  'ProcessingScreen'
>;

type ProcessingScreenRouteProp = RouteProp<
  AddStackParamList,
  'ProcessingScreen'
>;

interface ProcessingStep {
  icon: string;
  label: string;
  completed: boolean;
}

const ProcessingScreen = () => {
  const navigation = useNavigation<ProcessingScreenNavigationProp>();
  const route = useRoute<ProcessingScreenRouteProp>();
  const { colors, spacing, radius } = useTheme();

  const podcastData = route.params.podcastData;
  console.log("PodCast Data",podcastData);
  
  const [progress, setProgress] = useState(0);
  const [notifyWhenDone, setNotifyWhenDone] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const processingSteps: ProcessingStep[] = [
    { icon: 'headset-outline', label: 'Extracting audio', completed: false },
    { icon: 'document-text-outline', label: 'Generating Transcript', completed: false },
    { icon: 'create-outline', label: 'Summarizing key points', completed: false },
    { icon: 'flash-outline', label: 'Generating highlights', completed: false },
    { icon: 'film-outline', label: 'Fusing clips', completed: false }, // ✅ NEW
  ];

  const [steps, setSteps] = useState(processingSteps);

  // Data from AI pipeline
  const [transcriptData, setTranscriptData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [highlightClips, setHighlightClips] = useState<any[]>([]);
  const [fusedVideo, setFusedVideo] = useState<any>(null); // ✅ NEW

  useEffect(() => {
    runProcessingPipeline();
  }, []);

  const runProcessingPipeline = async () => {
    try {
      // STEP 1: Extract Audio
      setCurrentStep(0);
      setProgress(5);

      // STEP 2: Transcription
      setCurrentStep(1);
      setProgress(25);

      const transcribeRes = await aiService.transcribe({
        youtube_url: podcastData.url,
        include_timestamps: true,
      });

      setTranscriptData(transcribeRes.data);
      setProgress(45);

      // STEP 3: Summarization
      setCurrentStep(2);
      setProgress(65);

      const summarizeRes = await aiService.summarize({
        text: transcribeRes.data.text,
        segments: transcribeRes.data.segments,
        duration_seconds: transcribeRes.data.duration_seconds,
      });

      setSummaryData(summarizeRes.data);
      setProgress(80);

      // STEP 4: Highlight Generation
      setCurrentStep(3);
      setProgress(85);

      const highlightPayload = {
        youtube_url: podcastData.url,
        segments: transcribeRes.data.segments,
        duration: "3m",
        suggestion: podcastData.suggestion || '',
        demo_mode: false,
      };

      const highlightRes = await aiService.generateHighlight(highlightPayload);

      const clips = highlightRes.data.clips || [];
      setHighlightClips(clips);

      // STEP 5: Fuse Clips ✅
      setCurrentStep(4);
      setProgress(95);

      const clipUrls = clips.map((clip: any) => clip.url);

      if (!clipUrls.length) {
        throw new Error('No clips available to fuse');
      }

      const fuseRes = await aiService.fuseClips({
        clip_urls: clipUrls,
        transition: 'fade',
      });

      setFusedVideo(fuseRes.data);
      setProgress(100);

      // Navigate to Review Screen
      setTimeout(() => {
        navigation.replace('ReviewScreen', {
          processedData: {
            transcript: transcribeRes.data.segments,
            summary: summarizeRes.data.fullText,
            clips: clips,
            fusedVideo: fuseRes.data.video.url, // ✅ PASSED
            totalDuration: podcastData.duration,
          },
          podcastInfo: {
            title: podcastData.title,
            description: podcastData.description,
            thumbnailUrl: podcastData.thumbnail,
            url: podcastData.url,
            suggestion: podcastData.suggestion,
            duration: podcastData.duration,
            summary:summarizeRes.data
          },
        });
      }, 700);

    } catch (err: any) {
      console.log(err);
      Alert.alert(
        'Processing Failed',
        err?.response?.data?.message ||
          err?.message ||
          'Something went wrong while processing the podcast.'
      );
    }
  };

  // Progress → Steps mapping
  useEffect(() => {
    const newSteps = [...processingSteps];

    if (progress >= 10) newSteps[0].completed = true;
    if (progress >= 35) newSteps[1].completed = true;
    if (progress >= 70) newSteps[2].completed = true;
    if (progress >= 90) newSteps[3].completed = true;
    if (progress >= 100) newSteps[4].completed = true;

    setSteps(newSteps);
  }, [progress]);

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          Processing Podcast
        </Text>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { marginTop: spacing.xl }]}>
          <View
            style={[
              styles.progressBarBackground,
              { backgroundColor: colors.border, borderRadius: radius.sm },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progress}%`,
                  backgroundColor: colors.primary,
                  borderRadius: radius.sm,
                },
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

        {/* Steps */}
        <View style={[styles.stepsContainer, { marginTop: spacing.xl }]}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: step.completed
                      ? colors.primary
                      : currentStep === index
                      ? `${colors.primary}40`
                      : colors.surface,
                  },
                ]}
              >
                <Ionicons
                  name={step.icon as any}
                  size={24}
                  color={
                    step.completed
                      ? colors.onPrimary
                      : currentStep === index
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
              </View>

              <Text
                style={[
                  styles.stepLabel,
                  {
                    color:
                      step.completed || currentStep === index
                        ? colors.text
                        : colors.textSecondary,
                    fontWeight: currentStep === index ? '600' : '400',
                  },
                ]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Notify Switch */}
        <View
          style={[
            styles.notifyContainer,
            { marginTop: 'auto', marginBottom: spacing.lg },
          ]}
        >
          <Text style={[styles.notifyLabel, { color: colors.text }]}>
            Notify me when done
          </Text>
          <Switch value={notifyWhenDone} onValueChange={setNotifyWhenDone} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  progressContainer: { alignItems: 'center' },
  progressBarBackground: { width: '100%', height: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  progressText: { fontSize: 16, fontWeight: '600' },
  stepsContainer: { gap: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: { fontSize: 16, flex: 1 },
  notifyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifyLabel: { fontSize: 16, fontWeight: '500' },
});

export default ProcessingScreen;