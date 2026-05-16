// src/screens/Profile/ProfileScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../components/atoms/Typography';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../../store';
import { postsService } from '../../services/postsService';
import { userService } from '../../services/userService';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { selectAuthUser } from '../../store/auth/authSelectors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Screen has 16 padding on each side (32 total) + grid gaps
const IMAGE_SIZE = (SCREEN_WIDTH - 32 - 6) / 3;

type ProfileStackParamList = {
  ProfileScreen: undefined;
  EditProfile: undefined;
  Followers: {
    initialTab: 'followers' | 'following';
    username: string;
  };
  PostViewer: {
    posts: any[];
    initialIndex?: number;
    username: string;
  };
};

type ProfileScreenNavigationProp =
  NativeStackNavigationProp<ProfileStackParamList>;

const ProfileScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const profile = useStore(s => s.profile);

  const [profileData, setProfileData] = useState({
    name: '',
    username: '',
    bio: '',
    phone: '',
  });

  const [posts, setPosts] = useState<any[]>([]);

  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    posts: 0,
  });

  // ------------------------------------------------------
  // Load profile
  // ------------------------------------------------------

  useEffect(() => {
    if (profile) {
      setProfileData({
        name: `${profile.firstName} ${profile.lastName}`,
        username: profile.username,
        bio: profile.bio || '',
        phone: profile.phoneNumber || '',
      });
    }
  }, [profile]);

  // ------------------------------------------------------
  // Fetch posts
  // ------------------------------------------------------

  const fetchMyPosts = async () => {
    try {
      const response = await postsService.getMyPosts();
      const data = response.data || [];

      setPosts(data);

      setStats(prev => ({
        ...prev,
        posts: data.length,
      }));
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    }
  };

  // ------------------------------------------------------
  // Fetch stats
  // ------------------------------------------------------

  const fetchMyStats = async () => {
    try {
      const response = await userService.getUserStats();

      setStats(prev => ({
        ...prev,
        followers: response.data.followers || 0,
        following: response.data.following || 0,
      }));
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchMyPosts();
    fetchMyStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMyPosts(), fetchMyStats()]);
    setRefreshing(false);
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleEditProfile = () => navigation.navigate('EditProfile');
  const user = useStore(selectAuthUser);
  const logout = useStore(s => s.logout);

  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.replace('AuthStack' as never);
        },
      },
    ]);

  const handleFollowersPress = () => {
    console.log("User Id:", user);
    
    navigation.navigate('Followers', {
      initialTab: 'followers',
      username: profileData.username,
      userId:user?.id || null,
    });
  };

  const handleFollowingPress = () => {
    console.log("User Id:", user);
    
    navigation.navigate('Followers', {
      initialTab: 'following',
      username: profileData.username,
      userId:user?.id || null,
    });
  };

  // ------------------------------------------------------
  // Open post viewer
  // ------------------------------------------------------

  const handlePostPress = (postId: string) => {
    const postIndex = posts.findIndex(p => p.id === postId);

    const postsAsHighlights = posts.map(post => ({
      ...post,
      videoUrl: post.videoUrl || '',
      creator: {
        id: profile?.id,
        username: profile?.username,
        displayName: profile?.firstName + ' ' + profile?.lastName,
        avatarUrl: profile?.profilePhoto,
        isVerified: profile?.isVerified,
      },
    }));

    navigation.navigate('PostViewer', {
      posts: postsAsHighlights,
      initialIndex: postIndex,
      username: profileData.username,
    });
  };

  // ------------------------------------------------------
  // Delete post
  // ------------------------------------------------------

  const handleDeletePost = (postId: string) => {
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
              await postsService.deletePost(Number(postId));
              // Remove from local state immediately
              setPosts(prev => prev.filter(p => p.id !== postId));
              setStats(prev => ({ ...prev, posts: Math.max(0, prev.posts - 1) }));
            } catch (err) {
              Alert.alert('Error', 'Could not delete post. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ------------------------------------------------------
  // Render post grid item
  // ------------------------------------------------------

  const renderPost = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => handlePostPress(item.id)}
      onLongPress={() => handleDeletePost(item.id)}
      delayLongPress={400}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.postImage} />

      <View style={styles.postOverlay}>
        <Icon name="play" size={22} color="#FFFFFF" />
        <Typography variant="small" style={styles.postViews}>
          {formatCount(item.views)}
        </Typography>
      </View>

      {/* Subtle delete hint badge — visible on long press context */}
      <View style={styles.deleteHint}>
        <Icon name="trash-outline" size={13} color="rgba(255,255,255,0.7)" />
      </View>
    </TouchableOpacity>
  );

  // ------------------------------------------------------
  // Profile Header
  // ------------------------------------------------------

  const renderHeader = () => (
    <View style={{ paddingTop: 12 }}>
      <View style={styles.avatarContainer}>
        <Image
          source={{
            uri:
              profile?.profilePhoto ||
              'https://cdn-icons-png.flaticon.com/512/149/149071.png',
          }}
          style={styles.avatar}
        />
      </View>

      <View style={styles.userInfo}>
        <View style={styles.usernameRow}>
          <Typography
            variant="body"
            style={[styles.username, { color: colors.text }]}
          >
            @{profileData.username}
          </Typography>

          {profile?.isVerified && (
            <Icon name="checkmark-circle" size={18} color="#4F9EF8" />
          )}
        </View>

        <Typography
          variant="body"
          style={[styles.bio, { color: colors.textSecondary }]}
        >
          {profileData.bio}
        </Typography>
      </View>

      {/* Stats */}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Typography
            variant="h2"
            style={[styles.statNumber, { color: colors.text }]}
          >
            {stats.posts}
          </Typography>

          <Typography
            variant="caption"
            style={[styles.statLabel, { color: colors.textSecondary }]}
          >
            Posts
          </Typography>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.statItem} onPress={handleFollowersPress}>
          <Typography
            variant="h2"
            style={[styles.statNumber, { color: colors.text }]}
          >
            {formatCount(stats.followers)}
          </Typography>

          <Typography
            variant="caption"
            style={[styles.statLabel, { color: colors.textSecondary }]}
          >
            Followers
          </Typography>
        </TouchableOpacity>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <TouchableOpacity style={styles.statItem} onPress={handleFollowingPress}>
          <Typography
            variant="h2"
            style={[styles.statNumber, { color: colors.text }]}
          >
            {formatCount(stats.following)}
          </Typography>

          <Typography
            variant="caption"
            style={[styles.statLabel, { color: colors.textSecondary }]}
          >
            Following
          </Typography>
        </TouchableOpacity>
      </View>

      {/* Edit Profile */}

      <TouchableOpacity
        style={[styles.editButton, { borderColor: colors.primary }]}
        onPress={handleEditProfile}
      >
        <Icon name="create-outline" size={18} color={colors.primary} />

        <Typography
          variant="body"
          style={[styles.editButtonText, { color: colors.primary }]}
        >
          Edit Profile
        </Typography>
      </TouchableOpacity>

      <View style={styles.postsHeader}>
        <Typography
          variant="h3"
          family='poppins.semibold'
          style={[styles.postsTitle, { color: colors.text }]}
        >
          My Posts
        </Typography>
      </View>
    </View>
  );

  return (
    <Screen>
      {/* Profile header bar with logout */}
      <View style={styles.topBar}>
        <Typography size="xl" family="poppins.semiBold" style={{ color: colors.text }}>
          Profile
        </Typography>
        <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="log-out-outline" size={24} color="#E63946" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        columnWrapperStyle={styles.columnWrapper}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  listContent: {
    paddingBottom: 20,
  },

  avatarContainer: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },

  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },

  username: {
    fontWeight: '600',
  },

  bio: {
    textAlign: 'center',
    fontSize: 14,
  },

  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statNumber: {
    fontWeight: '700',
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 12,
  },

  statDivider: {
    width: 1,
    height: 40,
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 24,
    borderRadius: 25,
    borderWidth: 2,
    gap: 8,
  },

  editButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },

  postsHeader: {
    marginBottom: 12,
  },

  postsTitle: {
    fontWeight: '600',
  },

  columnWrapper: {
    gap: 3,
  },

  postItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginBottom: 3,
    position: 'relative',
  },

  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
  },

  postOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  postViews: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4,
  },

  deleteHint: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    padding: 4,
  },
});

export default ProfileScreen;