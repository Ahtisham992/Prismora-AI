import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SummaryModal from './modals/summaryModal';
import CommentsModal from './modals/commentModal';
import { likesService } from '../../services/likeService';
import { userService } from '../../services/userService';
import { postsService } from '../../services/postsService';
import type { HomeStackParamList } from '../../navigation/stacks/HomeStack';
import { useStore } from '../../store';
import { selectAuthUser } from '../../store/auth/authSelectors';

// Types (unchanged)
export interface Creator {
  id: number;
  name?: string;
  avatar?: string;
}

export interface Reel {
  id: number;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  duration: number;
  likes: number;
  dislikes: number;
  commentsCount: number;
  shares: number;
  views: number;
  creatorId: number;
  createdAt: string;
  updatedAt: string;
  creator: Creator;
  summary?: {
    keyPoints?: string | null;
    fullText?: string | null;
    topics?: string | null;
    duration?: string | null;
  } | null;
}

interface ReelsProps {
  data: Reel[];
  initialIndex?: number;
}

// Individual reel item
const ReelItem: React.FC<{
  item: Reel;
  isActive: boolean;
  containerHeight: number;
  isScreenFocused: boolean;
}> = ({ item, isActive, containerHeight, isScreenFocused }) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const currentUser = useStore(selectAuthUser);
  const isOwnPost = currentUser?.id === item.creatorId;

  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(!isActive || !isScreenFocused);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [dislikeCount, setDislikeCount] = useState(item.dislikes);
  const [bookmarked, setBookmarked] = useState(false);
  const [resizeMode, setResizeMode] = useState<'cover' | 'contain'>('cover');
  const [posterResizeMode, setPosterResizeMode] = useState<'cover' | 'contain'>('cover');
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [isReacting, setIsReacting] = useState(false); // prevent double taps
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Fetch follow status once when this reel is active and it's not our own post
  useEffect(() => {
    if (!isOwnPost && isActive) {
      userService
        .getIsFollowing(item.creatorId)
        .then(res => setIsFollowing(res.data?.isFollowing ?? false))
        .catch(() => {});
    }
  }, [isActive, item.creatorId]);

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing); // optimistic
    try {
      if (wasFollowing) {
        await userService.unfollowUser(item.creatorId);
      } else {
        await userService.followUser(item.creatorId);
      }
    } catch {
      setIsFollowing(wasFollowing); // revert on error
    } finally {
      setFollowLoading(false);
    }
  };

  const videoRef = useRef<Video>(null);
  // Track whether we already incremented views for this reel activation
  const viewCounted = useRef(false);

  // Increment view count once when this reel becomes the active card
  useEffect(() => {
    if (isActive && isScreenFocused && !viewCounted.current) {
      viewCounted.current = true;
      postsService.incrementViews(item.id).catch(() => {});
    }
    if (!isActive) {
      // Reset so next time this reel scrolls into view it counts again
      viewCounted.current = false;
    }
  }, [isActive, isScreenFocused]);

  // Update paused state
  useEffect(() => {
    setPaused(!isActive || !isScreenFocused);
  }, [isActive, isScreenFocused]);

  // Thumbnail resize mode
  useEffect(() => {
    if (item.thumbnailUrl) {
      Image.getSize(
        item.thumbnailUrl,
        (width, height) => {
          const ratio = height / width;
          setPosterResizeMode(ratio < 1.5 ? 'contain' : 'cover');
        },
        error => console.log('Thumbnail size error:', error),
      );
    }
  }, [item.thumbnailUrl]);

  const onLoad = (data: any) => {
    setLoading(false);
    setError(false);
    if (data?.naturalSize) {
      const { width, height } = data.naturalSize;
      setResizeMode(height / width < 1.5 ? 'contain' : 'cover');
    }
  };

  const onError = () => {
    setError(true);
    setLoading(false);
  };

  // ---------- Like/Dislike API integration ----------
  const handleLike = async () => {
    if (isReacting) return;
    setIsReacting(true);

    // Optimistic update
    const wasLiked = liked;
    const wasDisliked = disliked;
    let newLikeCount = likeCount;
    let newDislikeCount = dislikeCount;

    if (wasLiked) {
      // Remove like
      newLikeCount = likeCount - 1;
      setLiked(false);
      setLikeCount(newLikeCount);
    } else if (wasDisliked) {
      // Switch from dislike to like
      newDislikeCount = dislikeCount - 1;
      newLikeCount = likeCount + 1;
      setDisliked(false);
      setLiked(true);
      setLikeCount(newLikeCount);
      setDislikeCount(newDislikeCount);
    } else {
      // Add like
      newLikeCount = likeCount + 1;
      setLiked(true);
      setLikeCount(newLikeCount);
    }

    try {
      if (wasLiked) {
        await likesService.remove(item.id);
      } else {
        await likesService.like(item.id);
      }
      // API success – no further action needed
    } catch (err) {
      // Revert optimistic update
      console.error('Like/remove failed:', err);
      setLiked(wasLiked);
      setDisliked(wasDisliked);
      setLikeCount(likeCount);
      setDislikeCount(dislikeCount);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    } finally {
      setIsReacting(false);
    }
  };

  const handleDislike = async () => {
    if (isReacting) return;
    setIsReacting(true);

    // Optimistic update
    const wasLiked = liked;
    const wasDisliked = disliked;
    let newLikeCount = likeCount;
    let newDislikeCount = dislikeCount;

    if (wasDisliked) {
      // Remove dislike
      newDislikeCount = dislikeCount - 1;
      setDisliked(false);
      setDislikeCount(newDislikeCount);
    } else if (wasLiked) {
      // Switch from like to dislike
      newLikeCount = likeCount - 1;
      newDislikeCount = dislikeCount + 1;
      setLiked(false);
      setDisliked(true);
      setLikeCount(newLikeCount);
      setDislikeCount(newDislikeCount);
    } else {
      // Add dislike
      newDislikeCount = dislikeCount + 1;
      setDisliked(true);
      setDislikeCount(newDislikeCount);
    }

    try {
      if (wasDisliked) {
        await likesService.remove(item.id);
      } else {
        await likesService.dislike(item.id);
      }
    } catch (err) {
      console.error('Dislike/remove failed:', err);
      setLiked(wasLiked);
      setDisliked(wasDisliked);
      setLikeCount(likeCount);
      setDislikeCount(dislikeCount);
      Alert.alert('Error', 'Failed to update dislike. Please try again.');
    } finally {
      setIsReacting(false);
    }
  };

  return (
    <View style={[styles.reelContainer, { height: containerHeight, width: '100%' }]}>
      <Video
        ref={videoRef}
        source={{ uri: item.videoUrl }}
        style={StyleSheet.absoluteFillObject}
        paused={paused}
        muted={muted}
        repeat={true}
        resizeMode={resizeMode}
        onLoad={onLoad}
        onError={onError}
        poster={item.thumbnailUrl}
        posterResizeMode={posterResizeMode}
      />

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load video</Text>
        </View>
      )}

      <SafeAreaView style={styles.overlay}>
        {/* Spacer — pushes everything down to the bottom */}
        <View style={styles.topSpacer} />

        {/* Bottom section */}
        <View style={styles.bottomRow}>
          <View style={styles.videoInfo}>

            {/* Creator row — above title; disabled for own posts */}
            <TouchableOpacity
              style={styles.creatorRow}
              activeOpacity={isOwnPost ? 1 : 0.8}
              onPress={() => {
                if (isOwnPost) return;
                navigation.navigate('OtherUserProfile', {
                  userId: String(item.creatorId),
                  username: item.creator.name || '',
                  displayName: item.creator.name || '',
                  avatarUrl: item.creator.avatar || '',
                });
              }}
            >
              <Image
                source={{
                  uri: item.creator.avatar || 'https://via.placeholder.com/40',
                }}
                style={styles.avatar}
              />
              <Text style={styles.creatorName}>
                {item.creator.name || `Creator ${item.creatorId}`}
              </Text>

              {/* Follow pill — only shown for other people's posts */}
              {!isOwnPost && (
                <TouchableOpacity
                  style={[
                    styles.followPill,
                    isFollowing && styles.followPillActive,
                  ]}
                  onPress={handleFollow}
                  disabled={followLoading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[
                    styles.followPillText,
                    isFollowing && styles.followPillTextActive,
                  ]}>
                    {isFollowing ? 'Following' : '+ Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {item.title}
            </Text>
            <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
              {item.description}
            </Text>
          </View>


          <View style={styles.actionsColumn}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={isReacting}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? 'red' : 'white'} />
              <Text style={styles.actionText}>{likeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleDislike} disabled={isReacting}>
              <Ionicons name={disliked ? 'heart-dislike' : 'heart-dislike-outline'} size={24} color={disliked ? 'yellow' : 'white'} />
              <Text style={styles.actionText}>{dislikeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => setCommentsModalVisible(true)}>
              <Ionicons name="chatbubble-outline" size={24} color="white" />
              <Text style={styles.actionText}>{item.commentsCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => setSummaryModalVisible(true)}>
              <Ionicons name="document-text-outline" size={24} color="white" />
              <Text style={styles.actionText}>Summary</Text>
            </TouchableOpacity>

            {/* Report (other people's posts) OR Delete (own posts) */}
            {isOwnPost ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  Alert.alert(
                    'Delete Post',
                    'This will permanently remove your post. This action cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await postsService.deletePost(item.id);
                            Alert.alert('Deleted', 'Your post has been removed.');
                            navigation.goBack();
                          } catch {
                            Alert.alert('Error', 'Could not delete post. Please try again.');
                          }
                        },
                      },
                    ]
                  )
                }
              >
                <Ionicons name="trash-outline" size={24} color="#FF4D4D" />
                <Text style={[styles.actionText, { color: '#FF4D4D' }]}>Delete</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  Alert.alert(
                    'Report Post',
                    'Why are you reporting this?',
                    [
                      { text: 'Spam', onPress: () => Alert.alert('Reported', 'Thanks for letting us know.') },
                      { text: 'Inappropriate', onPress: () => Alert.alert('Reported', 'Thanks for letting us know.') },
                      { text: 'Misinformation', onPress: () => Alert.alert('Reported', 'Thanks for letting us know.') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  )
                }
              >
                <Ionicons name="flag-outline" size={24} color="white" />
                <Text style={styles.actionText}>Report</Text>
              </TouchableOpacity>
            )}

            {/* Share — prototype using native Share sheet */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                Share.share({
                  title: item.title,
                  message: `Check out this podcast clip: "${item.title}"\n${item.videoUrl}`,
                })
              }
            >
              <Ionicons name="share-social-outline" size={24} color="white" />
              <Text style={styles.actionText}>{item.shares}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => setBookmarked(!bookmarked)}>
              <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={24} color={bookmarked ? 'cyan' : 'white'} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => setMuted(!muted)}>
              <Ionicons name={muted ? 'volume-off-outline' : 'volume-high-outline'} size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>

      <SummaryModal visible={summaryModalVisible} onClose={() => setSummaryModalVisible(false)} reelId={item.id} />
      <CommentsModal visible={commentsModalVisible} onClose={() => setCommentsModalVisible(false)} postId={item.id} />
    </View>
  );
};

// Main Reels component
const Reels: React.FC<ReelsProps> = ({ data, initialIndex = 0 }) => {
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  // Each reel fills the space between the status bar and the bottom nav bar
  const [containerHeight, setContainerHeight] = useState(
    windowHeight - insets.top - insets.bottom,
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const isScreenFocused = useIsFocused();

  const viewabilityConfig = { itemVisiblePercentThreshold: 70 };
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

  const handleContainerLayout = (event: any) =>
    setContainerHeight(event.nativeEvent.layout.height);

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item, index }) => (
          <ReelItem
            item={item}
            isActive={index === activeIndex}
            containerHeight={containerHeight}
            isScreenFocused={isScreenFocused}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        initialScrollIndex={initialIndex}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        getItemLayout={(_, index) => ({ length: containerHeight, offset: containerHeight * index, index })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  reelContainer: {
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  topSpacer: {
    flex: 1,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    marginRight: 10,
  },
  creatorName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,                       // truncate before pushing pill off-screen
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  followPill: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  followPillActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: 'transparent',
  },
  followPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  followPillTextActive: {
    color: 'rgba(255,255,255,0.8)',
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  videoInfo: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
    marginBottom: 4,
  },
  description: {
    color: 'white',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  actionsColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
});

export default Reels;
