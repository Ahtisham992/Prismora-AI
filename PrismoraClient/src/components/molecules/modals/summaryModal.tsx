// components/SummaryModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../hooks/useTheme';
import { Modal } from '../../atoms/Modal';
import { summaryService } from '../../../services/summaryService';

interface SummaryModalProps {
  visible: boolean;
  onClose: () => void;
  reelId: number;
  summary?: any | null;
}

const SummaryModal: React.FC<SummaryModalProps> = ({
  visible,
  onClose,
  reelId,
  summary: externalSummary,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);

  useEffect(() => {
    if (visible) {
      if (externalSummary) {
        setSummary(externalSummary);
        setError(null);
        setLoading(false);
      } else if (!summary && !loading) {
        fetchSummary();
      }
    }
  }, [visible, externalSummary, reelId]);

  useEffect(() => {
    if (!visible) {
      setSummary(null);
      setError(null);
      setLoading(false);
    }
  }, [visible]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await summaryService.get(reelId);
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      setError('Could not load summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatKeyPoints = (keyPoints?: string) => {
    if (!keyPoints) return null;
    try {
      const parsed = JSON.parse(keyPoints);
      if (Array.isArray(parsed)) {
        return parsed.map((point: string) => `• ${point}`).join('\n');
      }
    } catch (e) {}
    return keyPoints;
  };

  const formatTopics = (topics?: string) => {
    if (!topics) return null;
    try {
      const parsed = JSON.parse(topics);
      if (Array.isArray(parsed)) {
        return parsed.join(', ');
      }
    } catch (e) {}
    return topics;
  };

  const hasContent = () => {
    if (!summary) return false;
    return !!(summary.duration || summary.topics || summary.keyPoints || summary.fullText);
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      backdropOpacity={0.7}
      dismissOnBackdropPress={true}
      style={{ marginHorizontal: spacing.md, padding: 0 }}
    >
      <View
        style={{
          maxHeight: '95%',
          width: '100%',
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          overflow: 'hidden',
        }}
      >
        {/* Header with proper icon and compact close button */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: colors.text,
                fontFamily: typography.families?.semiBold,
              }}
            >
              AI Summary
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ padding: 4 }}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.lg,
          }}
        >
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
                Loading summary...
              </Text>
            </View>
          ) : error ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Text style={{ color: colors.error, textAlign: 'center', marginBottom: spacing.md }}>
                {error}
              </Text>
              <TouchableOpacity
                onPress={fetchSummary}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                }}
              >
                <Text style={{ color: colors.onPrimary }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !hasContent() ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: 'center',
                  fontSize: 16,
                  marginTop: spacing.md,
                }}
              >
                No summary available for this reel.
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: 'center',
                  fontSize: 14,
                  marginTop: spacing.xs,
                }}
              >
                Check back later or try another video.
              </Text>
            </View>
          ) : (
            <>
              {summary.duration && (
                <View style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={styles.sectionTitle(colors)}>Duration</Text>
                  </View>
                  <Text style={[styles.sectionContent(colors), { textAlign: 'justify' }]}>
                    {summary.duration}
                  </Text>
                </View>
              )}
              {summary.topics && (
                <View style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ionicons name="pricetags-outline" size={16} color={colors.primary} />
                    <Text style={styles.sectionTitle(colors)}>Topics</Text>
                  </View>
                  <Text style={[styles.sectionContent(colors), { textAlign: 'justify' }]}>
                    {formatTopics(summary.topics)}
                  </Text>
                </View>
              )}
              {summary.keyPoints && (
                <View style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ionicons name="bulb-outline" size={16} color={colors.primary} />
                    <Text style={styles.sectionTitle(colors)}>Key Points</Text>
                  </View>
                  <Text style={[styles.sectionContent(colors), { textAlign: 'justify' }]}>
                    {formatKeyPoints(summary.keyPoints)}
                  </Text>
                </View>
              )}
              {summary.fullText && (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ionicons name="newspaper-outline" size={16} color={colors.primary} />
                    <Text style={styles.sectionTitle(colors)}>Full Summary</Text>
                  </View>
                  <Text style={[styles.sectionContent(colors), { textAlign: 'justify' }]}>
                    {summary.fullText}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {!loading && !error && hasContent() && (
          <View
            style={{
              padding: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.onPrimary, fontWeight: '600', fontSize: 15 }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = {
  sectionTitle: (colors: any) => ({
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.3,
  }),
  sectionContent: (colors: any) => ({
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  }),
};

export default SummaryModal;