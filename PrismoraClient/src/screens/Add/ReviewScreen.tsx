// screens/Add/ReviewScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddStackParamList, ClipData } from '../../navigation/stacks/AddStack';
import { ScrollScreen } from '../../components/layout/ScrollScreen';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { useTheme } from '../../hooks/useTheme';
import Ionicons from 'react-native-vector-icons/Ionicons';

// AI service

// Video player – adjust import based on your setup
// For Expo: import { Video } from 'expo-av';
// For React Native CLI: import Video from 'react-native-video';
import Video from 'react-native-video'; // <- make sure this is installed
import VideoEditor from '../../components/organisms/VideoEditor';

type ReviewScreenNavigationProp = NativeStackNavigationProp<
  AddStackParamList,
  'ReviewScreen'
>;
type ReviewScreenRouteProp = RouteProp<AddStackParamList, 'ReviewScreen'>;

type TabType = 'Transcript' | 'Summary' | 'Highlights';

// Helper to format seconds to MM:SS
const formatTime = (seconds?: number) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

// Helper to format duration as e.g., "2m 15s"
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const ReviewScreen = () => {
  const navigation = useNavigation<ReviewScreenNavigationProp>();
  const route = useRoute<ReviewScreenRouteProp>();
  const { colors, spacing, radius } = useTheme();

  const { processedData, podcastInfo } = route.params;
  console.log(processedData);

  const [activeTab, setActiveTab] = useState<TabType>('Transcript');
  const [isGenerating, setIsGenerating] = useState(false);
  const [visibleItems, setVisibleItems] = useState(20);

  // Fused Video
  const fusedVideoUrl = processedData?.fusedVideo;

  // Video preview modal state
  const [selectedClip, setSelectedClip] = useState<ClipData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);
  // Map API clips to the expected display format
  const initialClips: ClipData[] = (processedData.clips || []).map(
    (clip: any, index: number) => ({
      id: clip.clip_index?.toString() || index.toString(),
      title: `Clip ${index + 1}`,
      startTime: formatTime(clip.start_time),
      endTime: formatTime(clip.end_time),
      thumbnailUrl: podcastInfo.thumbnailUrl,
      duration: formatDuration(clip.duration),
      url: clip.url, // store the video URL for preview
      transcriptPreview: clip.transcript_preview,
      qualityScore: clip.quality_score,
      conversationType: clip.conversation_type,
    }),
  );

  const [clips, setClips] = useState<ClipData[]>(initialClips);

  const tabs: TabType[] = ['Transcript', 'Summary', 'Highlights'];

  const handleRemoveClip = (clipId: string) => {
    setClips(prev => prev.filter(clip => clip.id !== clipId));
  };

  const handleAddClip = () => {
    console.log('Add Clip Modal Coming Soon...');
    // TODO: implement custom clip addition screen
  };

  const handlePreviewClip = (clip: ClipData) => {
    setSelectedClip(clip);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedClip(null);
  };

  // Generate final highlight (e.g., combine clips into one video)
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      console.log('Fused Video', processedData.fusedVideo);
      const finalVideoUrl =
        editedVideoUrl && editedVideoUrl.length > 0
          ? editedVideoUrl
          : processedData.fusedVideo;

      navigation.navigate('PreUploadScreen', {
        postData: {
          title: podcastInfo.title,
          description: podcastInfo.description,
          thumbnailUrl: podcastInfo.thumbnailUrl,
          url: finalVideoUrl,
          duration: processedData.totalDuration,
          visibility: 'public',
          summary: podcastInfo.summary,
        },
      });
    } catch (error: any) {
      console.log('Highlight generation failed:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message ||
        'Failed to generate highlight. Please try again.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Transcript':
        const renderedTranscript = processedData.transcript.slice(
          0,
          visibleItems,
        );
        return (
          <View style={styles.tabContent}>
            {renderedTranscript.map((item: any, index: number) => (
              <View key={index} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <Text
                    style={[styles.timelineTime, { color: colors.primary }]}
                  >
                    {item.timestamp || formatTime(item.start)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.timelineContent,
                    { borderLeftColor: colors.border },
                    index === renderedTranscript.length - 1 &&
                      visibleItems >= processedData.transcript.length
                      ? { borderLeftColor: 'transparent' }
                      : {},
                  ]}
                >
                  <Text style={[styles.transcriptText, { color: colors.text }]}>
                    {item.text}
                  </Text>
                </View>
              </View>
            ))}

            {visibleItems < processedData.transcript.length && (
              <TouchableOpacity
                onPress={() => setVisibleItems(prev => prev + 20)}
                style={[
                  styles.loadMoreButton,
                  {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}10`,
                  },
                ]}
              >
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  Load More ({processedData.transcript.length - visibleItems}{' '}
                  left)
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        );

      case 'Summary':
        return (
          <View style={styles.tabContent}>
            <Text style={[styles.summaryText, { color: colors.text }]}>
              {processedData.summary}
            </Text>
          </View>
        );

      case 'Highlights':
        if (clips.length === 0) {
          return (
            <View style={styles.emptyState}>
              <Ionicons
                name="videocam-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.emptyStateText, { color: colors.textSecondary }]}
              >
                No clips generated yet. Tap "Generate" to create highlights.
              </Text>
            </View>
          );
        }

        return (
          <View style={styles.tabContent}>
            {clips.map(clip => (
              <Card key={clip.id} style={styles.clipCard}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handlePreviewClip(clip)}
                >
                  <View style={styles.clipContent}>
                    {/* Thumbnail placeholder (you can generate from video URL) */}
                    <View
                      style={[
                        styles.clipThumbnail,
                        {
                          backgroundColor: colors.surface,
                          borderRadius: radius.sm,
                        },
                      ]}
                    >
                      <Ionicons
                        name="play-circle-outline"
                        size={32}
                        color={colors.primary}
                      />
                    </View>

                    <View style={styles.clipInfo}>
                      <Text
                        style={[styles.clipTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {clip.title}
                      </Text>
                      <Text
                        style={[
                          styles.clipTime,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {clip.startTime} - {clip.endTime} ({clip.duration})
                      </Text>
                      {clip.transcriptPreview && (
                        <Text
                          style={[
                            styles.clipPreview,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={2}
                        >
                          {clip.transcriptPreview}
                        </Text>
                      )}
                      {typeof clip.qualityScore === 'number' && (
                        <View style={styles.qualityBadge}>
                          <Ionicons name="star" size={12} color="#FFD700" />
                          <Text
                            style={[
                              styles.qualityText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {Math.round(clip.qualityScore * 100)}% quality
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() => handleRemoveClip(clip.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Card>
            ))}

            <TouchableOpacity
              onPress={handleAddClip}
              style={[
                styles.addClipButton,
                {
                  borderColor: colors.primary,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.addClipText, { color: colors.primary }]}>
                Add Custom Clip
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <ScrollScreen padding={false}>
        <View style={[styles.container, { paddingHorizontal: spacing.md }]}>
          {/* Header */}
          <View
            style={[styles.header, { marginTop: 20, marginBottom: spacing.lg }]}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Review
            </Text>
          </View>

          {/* Tabs */}
          <View style={[styles.tabsContainer, { marginBottom: spacing.lg }]}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab,
                  {
                    backgroundColor:
                      activeTab === tab ? colors.primary : colors.surface,
                    borderRadius: radius.pill,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: activeTab === tab ? colors.onPrimary : colors.text,
                      fontWeight: activeTab === tab ? '600' : '400',
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {renderTabContent()}

          {/* Action Buttons */}
          <View
            style={[
              styles.actionButtons,
              { gap: spacing.md, marginTop: spacing.xl },
            ]}
          >
            <Button
              title="Edit"
              variant="secondary"
              onPress={() => setShowEditor(true)} // ✅ OPEN EDITOR
              style={[
                styles.actionButton,
                { borderWidth: 1, borderColor: colors.primary },
              ]}
            />
            <Button
              title="Generate"
              onPress={handleGenerate}
              loading={isGenerating}
              disabled={isGenerating}
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollScreen>

      {/* Video Preview Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderRadius: radius.lg },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedClip?.title}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.videoContainer}>
              {selectedClip?.url ? (
                <Video
                  source={{ uri: selectedClip.url }}
                  style={styles.video}
                  controls={true}
                  resizeMode="contain"
                  paused={false}
                  onError={err => {
                    console.log('Video error:', err);
                    Alert.alert(
                      'Playback Error',
                      'Could not play video. Please try opening in browser.',
                    );
                  }}
                />
              ) : (
                <View style={styles.noVideoContainer}>
                  <Text style={{ color: colors.textSecondary }}>
                    No video available for this clip.
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.modalActions}>
              {selectedClip?.url && (
                <Button
                  title="Open in Browser"
                  variant="secondary"
                  onPress={() => {
                    Linking.openURL(selectedClip.url!).catch(err =>
                      Alert.alert('Error', 'Could not open URL.'),
                    );
                  }}
                  style={styles.modalButton}
                />
              )}
              <Button
                title="Close"
                onPress={closeModal}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 🎬 VIDEO EDITOR */}
      {showEditor && (
        <Modal visible={true} animationType="slide">
          <VideoEditor
            videos={fusedVideoUrl}
            license={null} // or your license key
            onFinish={({ result, error }) => {
              setShowEditor(false);

              if (error) {
                // Alert.alert('Editor Error', 'Something went wrong');
                return;
              }

              const url = result?.url;

              console.log('Edited result:', result);

              if (url) {
                setEditedVideoUrl(url); // ✅ STORE EDITED URL
              }

              Alert.alert('Success', 'Video edited successfully!');
            }}
          />

          <TouchableOpacity
            onPress={() => setShowEditor(false)}
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 10,
            }}
          >
            <Ionicons name="close-circle" size={32} color="white" />
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700' },

  tabsContainer: { flexDirection: 'row', gap: 12 },
  tab: { paddingHorizontal: 20, paddingVertical: 8 },
  tabText: { fontSize: 14 },

  tabContent: { gap: 16, paddingTop: 8 },

  timelineRow: { flexDirection: 'row' },
  timelineLeft: { width: 55, alignItems: 'flex-start', paddingTop: 2 },
  timelineTime: { fontSize: 13, fontWeight: '700' },
  timelineContent: {
    flex: 1,
    paddingLeft: 16,
    paddingBottom: 28,
    borderLeftWidth: 2,
  },
  transcriptText: { fontSize: 16, lineHeight: 26, letterSpacing: 0.2 },

  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 20,
    gap: 6,
  },
  loadMoreText: { fontSize: 15, fontWeight: '600' },

  summaryText: { fontSize: 15, lineHeight: 24 },

  clipCard: { padding: 0, marginBottom: 12 },
  clipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  clipThumbnail: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clipInfo: { flex: 1, gap: 4 },
  clipTitle: { fontSize: 16, fontWeight: '600' },
  clipTime: { fontSize: 12 },
  clipPreview: { fontSize: 12, opacity: 0.8 },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  qualityText: { fontSize: 11 },
  removeButton: { padding: 8 },

  addClipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 8,
  },
  addClipText: { fontSize: 16, fontWeight: '600' },

  actionButtons: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  actionButton: { flex: 1 },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyStateText: { fontSize: 16, textAlign: 'center' },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  videoContainer: {
    aspectRatio: 16 / 9,
    width: '100%',
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modalButton: { flex: 1 },
});

export default ReviewScreen;
