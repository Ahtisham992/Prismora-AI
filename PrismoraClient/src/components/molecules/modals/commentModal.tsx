// components/CommentsModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../hooks/useTheme';
import { Modal } from '../../atoms/Modal';
import { commentsService } from '../../../services/commentService';

interface Comment {
  id: number;
  text: string;
  userId: number;
  user: {
    username: string;
    profilePhoto?: string | null;
  };
  createdAt: string;
  likes: number;
  isLiked?: boolean; // optional, depending on your API response
}

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: number;
}

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  onClose,
  postId,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) fetchComments();
  }, [visible, postId]);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await commentsService.getForPost(postId);
      // Assuming API returns an array of comments
      setComments(Array.isArray(data) ? data : data.comments || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      setError('Could not load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const newCommentObj = await commentsService.create(postId, { text: newComment.trim() });
      // Prepend the new comment (assuming API returns the created comment object)
      setComments(prev => [newCommentObj, ...prev]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment:', err);
      Alert.alert('Error', 'Could not post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: number, isLiked: boolean) => {
    try {
      if (isLiked) {
        await commentsService.unlike(commentId);
      } else {
        await commentsService.like(commentId);
      }
      // Optimistically update local state
      setComments(prev =>
        prev.map(c =>
          c.id === commentId
            ? { ...c, likes: isLiked ? c.likes - 1 : c.likes + 1, isLiked: !isLiked }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to toggle like:', err);
      Alert.alert('Error', 'Could not update like. Please try again.');
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      backdropOpacity={0.7}
      dismissOnBackdropPress={true}
      style={{ marginHorizontal: 0, padding: 0 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          height: screenHeight * 0.85,
          width: screenWidth * 0.9,
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          overflow: 'hidden',
          flexDirection: 'column',
          alignSelf: 'center',
        }}
      >
        {/* Header */}
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
            <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: colors.text,
                fontFamily: typography.families?.semiBold,
              }}
            >
              Comments ({comments.length})
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

        {/* Comments List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }}
          style={{ flex: 1 }}
        >
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>Loading comments...</Text>
            </View>
          ) : error ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Text style={{ color: colors.error, textAlign: 'center', marginBottom: spacing.md }}>{error}</Text>
              <TouchableOpacity
                onPress={fetchComments}
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
          ) : comments.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 16, marginTop: spacing.md }}>
                No comments yet
              </Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 14, marginTop: spacing.xs }}>
                Be the first to leave a comment!
              </Text>
            </View>
          ) : (
            comments.map(comment => (
              <View
                key={comment.id}
                style={{
                  flexDirection: 'row',
                  marginBottom: spacing.md,
                  gap: spacing.sm,
                }}
              >
                {/* Avatar */}
                <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.border }}>
                  {comment.user.profilePhoto ? (
                    <Image source={{ uri: comment.user.profilePhoto }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person" size={20} color={colors.textSecondary} />
                    </View>
                  )}
                </View>
                {/* Comment content */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontWeight: '600', color: colors.text }}>{comment.user.username}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {formatRelativeTime(comment.createdAt)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, textAlign: 'justify' }}>
                    {comment.text}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 }}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      onPress={() => handleLike(comment.id, comment.isLiked || false)}
                    >
                      <Ionicons
                        name={comment.isLiked ? 'heart' : 'heart-outline'}
                        size={16}
                        color={comment.isLiked ? 'red' : colors.textSecondary}
                      />
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{comment.likes}</Text>
                    </TouchableOpacity>
                    {/* Reply button placeholder */}
                    <TouchableOpacity>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Input Area */}
        <View
          style={{
            padding: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                fontSize: 14,
                color: colors.text,
                maxHeight: 100,
              }}
              placeholder="Write a comment..."
              placeholderTextColor={colors.textSecondary}
              multiline
              value={newComment}
              onChangeText={setNewComment}
              editable={!submitting}
            />
            <TouchableOpacity
              onPress={handleAddComment}
              disabled={!newComment.trim() || submitting}
              style={{
                backgroundColor: newComment.trim() ? colors.primary : colors.border,
                padding: spacing.sm,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Ionicons name="send" size={20} color={newComment.trim() ? colors.onPrimary : colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CommentsModal;