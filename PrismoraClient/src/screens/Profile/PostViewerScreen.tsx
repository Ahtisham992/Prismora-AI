// PostViewerScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RouteProp, useRoute, useIsFocused } from '@react-navigation/native';
import { DiscoverStackParamList } from '../../navigation/stacks/DiscoverStack';
import Reels from '../../components/molecules/ReelItem';

type PostViewerRouteProp = RouteProp<DiscoverStackParamList, 'PostViewer'>;

const PostViewerScreen = () => {
  const route = useRoute<PostViewerRouteProp>();
  const { posts, initialIndex } = route.params;
  const isFocused = useIsFocused();

  const reelsData = posts.map((post) => ({
    id: post.id,
    videoUrl: post.videoUrl,
    thumbnailUrl: post.thumbnailUrl,
    title: post.title || '',
    description: post.description || '',
    duration: post.duration || 0,
    // Use real counts so likes/comments/shares render correctly
    likes: post.likes ?? 0,
    dislikes: post.dislikes ?? 0,
    commentsCount: post.commentsCount ?? 0,
    shares: post.shares ?? 0,
    views: post.views ?? 0,
    creatorId: post.creator?.id ?? post.creatorId ?? 0,
    createdAt: post.createdAt || new Date().toISOString(),
    updatedAt: post.updatedAt || new Date().toISOString(),
    creator: {
      id: post.creator?.id ?? post.creatorId ?? 0,
      name: post.creator?.username || post.creator?.name || '',
      // avatarUrl is the field set by OtherUserProfileScreen; fall back to profilePhoto
      avatar: post.creator?.avatarUrl || post.creator?.avatar || post.creator?.profilePhoto || '',
    },
  }));

  return (
    <View style={styles.container}>
      <Reels data={reelsData} initialIndex={initialIndex} isScreenFocused={isFocused} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});

export default PostViewerScreen;