// src/screens/Profile/OtherUserProfileScreen.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { Typography } from "../../components/atoms/Typography";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { userService } from "../../services/userService";
import { postsService } from "../../services/postsService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = (SCREEN_WIDTH - 48) / 3;

type RouteParams = {
  OtherUserProfile: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified?: boolean;
  };
};

type HomeStackParamList = {
  OtherUserProfile: any;
  PostViewer: {
    posts: any[];
    initialIndex?: number;
    username: string;
  };
  Followers: {
    initialTab: "followers" | "following";
    username: string;
    userId: string;
  };
};

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

type PostItem = {
  id: string;
  thumbnailUrl: string;
  videoUrl?: string;
  views: number;
};

const OtherUserProfileScreen = () => {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RouteParams, "OtherUserProfile">>();

  const { userId } = route.params;

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [profileRes, statsRes, postsRes, followRes] = await Promise.all([
          userService.getUserById(userId),
          userService.getUserStatsById(userId),
          postsService.getUserPostsById(userId),
          userService.getIsFollowing(userId),
        ]);

        setProfile(profileRes.data);
        setStats(statsRes.data);

        setIsFollowing(followRes.data?.isFollowing ?? false);

        const formattedPosts = postsRes.data.map((p: any) => ({
          id: p.id.toString(),
          thumbnailUrl: p.thumbnailUrl,
          videoUrl: p.videoUrl,
          title: p.title || '',
          description: p.description || '',
          duration: p.duration || 0,
          likes: p.likes ?? 0,
          dislikes: p.dislikes ?? 0,
          commentsCount: p.commentsCount ?? 0,
          shares: p.shares ?? 0,
          views: p.views ?? 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));

        setPosts(formattedPosts);
      } catch (err) {
        console.warn("Failed to load user profile", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId]);

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleFollow = async () => {
    if (followLoading) return;

    try {
      setFollowLoading(true);

      if (isFollowing) {
        await userService.unfollowUser(userId);

        setIsFollowing(false);

        setStats((prev: any) => ({
          ...prev,
          followers: prev.followers - 1,
        }));
      } else {
        await userService.followUser(userId);

        setIsFollowing(true);

        setStats((prev: any) => ({
          ...prev,
          followers: prev.followers + 1,
        }));
      }
    } catch (err) {
      console.warn("Follow action failed", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFollowersPress = () => {
    navigation.navigate("Followers", {
      initialTab: "followers",
      username: profile.username,
      userId,
    });
  };

  const handleFollowingPress = () => {
    navigation.navigate("Followers", {
      initialTab: "following",
      username: profile.username,
      userId,
    });
  };

  const handlePostPress = (postId: string) => {
    const postIndex = posts.findIndex((p) => p.id === postId);

    const reels = posts.map((post) => ({
      id: post.id,
      videoUrl: post.videoUrl,
      thumbnailUrl: post.thumbnailUrl,
      title: post.title || `${profile.username}'s Post`,
      description: post.description || '',
      duration: post.duration || 0,
      likes: post.likes ?? 0,
      dislikes: post.dislikes ?? 0,
      commentsCount: post.commentsCount ?? 0,
      shares: post.shares ?? 0,
      views: post.views ?? 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      creator: {
        id: userId,
        username: profile.username,
        displayName: route.params.displayName,
        avatarUrl: route.params.avatarUrl,
      },
    }));

    navigation.navigate("PostViewer", {
      posts: reels,
      initialIndex: postIndex,
      username: profile.username,
    });
  };

  if (loading || !profile || !stats) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Safe-area-aware header so back arrow always clears the status bar */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Typography variant="h2" style={{ color: colors.text }}>
          {route.params.displayName}
        </Typography>

        <Icon name="ellipsis-vertical" size={24} color={colors.text} />
      </View>

      <View style={styles.avatarContainer}>
        <Image source={{ uri: route.params.avatarUrl }} style={styles.avatar} />
      </View>

      <View style={styles.userInfo}>
        <Typography variant="body" style={{ color: colors.text }}>
          @{profile.username}
        </Typography>

        <Typography variant="body" style={{ color: colors.textSecondary }}>
          {profile.bio || "No bio yet"}
        </Typography>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Typography variant="h2" style={{ color: colors.text }}>
            {stats.posts}
          </Typography>
          <Typography variant="caption" style={{ color: colors.textSecondary }}>
            Posts
          </Typography>
        </View>

        <TouchableOpacity style={styles.statItem} onPress={handleFollowersPress}>
          <Typography variant="h2" style={{ color: colors.text }}>
            {formatCount(stats.followers)}
          </Typography>
          <Typography variant="caption" style={{ color: colors.textSecondary }}>
            Followers
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statItem} onPress={handleFollowingPress}>
          <Typography variant="h2" style={{ color: colors.text }}>
            {stats.following}
          </Typography>
          <Typography variant="caption" style={{ color: colors.textSecondary }}>
            Following
          </Typography>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.followButton,
          {
            backgroundColor: isFollowing ? "transparent" : colors.primary,
            borderWidth: isFollowing ? 1 : 0,
            borderColor: colors.primary,
          },
        ]}
        onPress={handleFollow}
        disabled={followLoading}
      >
        {followLoading ? (
          <ActivityIndicator color={isFollowing ? colors.primary : "#fff"} />
        ) : (
          <Typography
            style={{
              color: isFollowing ? colors.primary : "#fff",
              fontWeight: "600",
            }}
          >
            {isFollowing ? "Following" : "Follow"}
          </Typography>
        )}
      </TouchableOpacity>

      <View style={styles.postsHeader}>
        <Typography variant="h3" style={{ color: colors.text }}>
          Posts
        </Typography>
      </View>
    </View>
  );

  const renderPost = ({ item }: { item: PostItem }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => handlePostPress(item.id)}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.postImage} />

      <View style={styles.postOverlay}>
        <Icon name="play" size={22} color="#fff" />
        <Typography variant="small" style={styles.postViews}>
          {formatCount(item.views)}
        </Typography>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.columnWrapper}
      />
    </View>
  );
};

export default OtherUserProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  avatarContainer: {
    alignItems: "center",
    marginBottom: 12,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  userInfo: {
    alignItems: "center",
    marginBottom: 20,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },

  statItem: {
    alignItems: "center",
  },

  followButton: {
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 20,
  },

  postsHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  columnWrapper: {
    paddingHorizontal: 16,
    gap: 3,
  },

  postItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginBottom: 3,
  },

  postImage: {
    width: "100%",
    height: "100%",
  },

  postOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  postViews: {
    color: "#fff",
    marginTop: 4,
  },
});