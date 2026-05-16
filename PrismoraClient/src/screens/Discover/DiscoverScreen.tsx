import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../components/atoms/Typography';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';

import { userService } from '../../services/userService';
import type { DiscoverStackParamList } from '../../navigation/stacks/DiscoverStack';
import { postsService } from '../../services/postsService';
import { searchService } from '../../services/searchService';
import { Loader } from '../../components/atoms/Loader';
import SmartImage from '../../components/atoms/SmartImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

type NavigationProp = NativeStackNavigationProp<DiscoverStackParamList>;

type Post = {
  id: number;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  duration: number;
  views: number;
  creator: {
    id: number;
    username: string;
    profilePhoto: string;
  };
};
type User = {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  profilePhoto: string;
  bio?: string | null;
  isFollowing?: boolean;
  followLoading?: boolean;
};

const categories = [
  { id: 'Technology', icon: 'hardware-chip' },
  { id: 'Business', icon: 'briefcase' },
  { id: 'Health', icon: 'fitness' },
  { id: 'Education', icon: 'school' },
  { id: 'Entertainment', icon: 'film' },
  { id: 'Sports', icon: 'basketball' },
  { id: 'Science', icon: 'flask' },
  { id: 'News', icon: 'newspaper' },
];

const DiscoverScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [categoryPosts, setCategoryPosts] = useState<Record<string, Post[]>>(
    {},
  );
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // Prefetch all categories and trending posts on page load
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch trending posts
        const trendingRes = await postsService.getTrendingPosts(10);
        setTrendingPosts(trendingRes.data);
        setPosts(trendingRes.data);

        // Prefetch all categories
        const categoryPromises = categories.map(cat =>
          postsService.getPostsByCategories([cat.id], 10),
        );
        const categoryResults = await Promise.all(categoryPromises);
        const catPostsMap: Record<string, Post[]> = {};
        categories.forEach((cat, idx) => {
          catPostsMap[cat.id] = categoryResults[idx].data;
        });
        setCategoryPosts(catPostsMap);

        // Fetch suggested users
        const usersRes = await userService.getSuggestedUsers();
        setSuggestedUsers(
          usersRes.data.map((u: User) => ({ ...u, isFollowing: false })),
        );
      } catch (err) {
        console.log('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCategoryPress = (categoryId: string) => {
    const newSelection = categoryId === selectedCategory ? null : categoryId;
    setSelectedCategory(newSelection);
    // Update posts immediately from prefetch
    if (newSelection) {
      setPosts(categoryPosts[newSelection] || []);
    } else {
      setPosts(trendingPosts);
    }
  };

  const handleUserPress = (userId: number) => {
    const user = suggestedUsers.find(u => u.id === userId);
    if (user) {
      navigation.navigate('OtherUserProfile', {
        userId: user.id,
        username: user.username,
        displayName: user.firstName
          ? `${user.firstName} ${user.lastName}`
          : user.username,
        avatarUrl: user.profilePhoto,
        isVerified: false,
      });
    }
  };

  const toggleFollow = async (userId: number) => {
    const user = suggestedUsers.find(u => u.id === userId);
    if (!user || user.followLoading) return;

    const currentlyFollowing = user.isFollowing;

    // optimistic update
    setSuggestedUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? {
            ...u,
            isFollowing: !currentlyFollowing,
            followLoading: true,
          }
          : u,
      ),
    );

    try {
      if (currentlyFollowing) {
        await userService.unfollowUser(userId);
      } else {
        await userService.followUser(userId);
      }

      setSuggestedUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, followLoading: false } : u)),
      );
    } catch (err) {
      console.log('Follow/unfollow error:', err);

      // rollback UI
      setSuggestedUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? {
              ...u,
              isFollowing: currentlyFollowing,
              followLoading: false,
            }
            : u,
        ),
      );
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearchLoading(true); // start loading

      const res = await searchService.search(searchQuery);

      navigation.navigate('SearchResults', {
        query: searchQuery,
        users: res.people,
        posts: res.posts,
      });
    } catch (err) {
      console.log('Search error:', err);
    } finally {
      setSearchLoading(false); // stop loading
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Loader size="large" />
      </View>
    );
  }
  return (
    <Screen padding>
      <Header title="Discover" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Bar - Enhanced */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>

          {/* LEFT ICON */}
          {searchLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.searchIcon} />
          ) : (
            <TouchableOpacity onPress={handleSearch} disabled={searchLoading}>
              {searchLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={styles.searchIcon}
                />
              ) : (
                <Icon
                  name="search"
                  size={20}
                  color={colors.textSecondary}
                  style={styles.searchIcon}
                />
              )}
            </TouchableOpacity>
          )}

          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search podcasts, creators, topics..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />


        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Typography style={[styles.sectionTitle, { color: colors.text }]}>
            Categories
          </Typography>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor:
                      selectedCategory === cat.id ? colors.primary : colors.surface,
                  },
                ]}
                onPress={() => handleCategoryPress(cat.id)}
                activeOpacity={0.7}
              >
                <Icon
                  name={cat.icon}
                  size={24}
                  color={selectedCategory === cat.id ? '#fff' : colors.primary}
                />
                <Typography
                  style={[
                    styles.categoryText,
                    {
                      color: selectedCategory === cat.id ? '#fff' : colors.text,
                    },
                  ]}
                >
                  {cat.id}
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Highlights / Posts */}
        <View style={styles.section}>
          <Typography style={[styles.sectionTitle, { color: colors.text }]}>
            {selectedCategory ? `${selectedCategory} Reels` : 'Trending 🔥'}
          </Typography>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.postsContent}
          >
            {posts.map(post => (
              <TouchableOpacity
                key={post.id}
                style={styles.clipCard}
                onPress={() =>
                  navigation.navigate('PostViewer', {
                    posts,
                    initialIndex: posts.findIndex(p => p.id === post.id),
                    username: post.creator.username,
                  })
                }
                activeOpacity={0.8}
              >
                <View style={styles.clipImageContainer}>
                  {/* <Image source={{ uri: post.thumbnailUrl }} style={styles.clipImage} /> */}
                  <SmartImage
                    uri={post.thumbnailUrl}
                    style={styles.clipImage}
                  />
                  <View style={[styles.durationBadge, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
                    <Typography style={styles.durationText}>
                      {formatDuration(post.duration)}
                    </Typography>
                  </View>
                </View>
                <Typography numberOfLines={2} style={[styles.clipTitle, { color: colors.text }]}>
                  {post.title}
                </Typography>
                <Typography style={[styles.clipViews, { color: colors.textSecondary }]}>
                  {formatCount(post.views)} views
                </Typography>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Suggested Users */}
        <View style={styles.section}>
          <Typography style={[styles.sectionTitle, { color: colors.text }]}>
            Suggested Creators
          </Typography>
          {suggestedUsers.map(user => (
            <TouchableOpacity
              key={user.id}
              style={[styles.userCard, { backgroundColor: colors.surface }]}
              onPress={() => handleUserPress(user.id)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: user.profilePhoto }}
                style={styles.userAvatar}
              />
              <View style={styles.userInfo}>
                <Typography style={[styles.userName, { color: colors.text }]}>
                  {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
                </Typography>
                <Typography style={[styles.userHandle, { color: colors.textSecondary }]}>
                  @{user.username}
                </Typography>
              </View>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  {
                    backgroundColor: user.isFollowing ? 'transparent' : colors.primary,
                    borderWidth: user.isFollowing ? 1 : 0,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => toggleFollow(user.id)}
                disabled={user.followLoading}
              >
                {user.followLoading ? (
                  <ActivityIndicator size="small" color={user.isFollowing ? colors.primary : '#fff'} />
                ) : (
                  <Typography
                    style={[
                      styles.followButtonText,
                      { color: user.isFollowing ? colors.primary : '#fff' },
                    ]}
                  >
                    {user.isFollowing ? 'Following' : 'Follow'}
                  </Typography>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
};

export default DiscoverScreen;

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 14,
    fontSize: 18,
    paddingHorizontal: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
  },
  categoryCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryText: {
    fontWeight: '500',
    fontSize: 15,
  },
  postsContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  clipCard: {
    width: CONTENT_CARD_WIDTH,
  },
  clipImageContainer: {
    position: 'relative',
    marginBottom: 8,
    backgroundColor: "black"
  },
  clipImage: {
    width: '100%',
    height: CONTENT_CARD_WIDTH * 1.3,
    borderRadius: 20,
    backgroundColor: 'black',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  clipTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  clipViews: {
    fontSize: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 14,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 25,
    minWidth: 90,
    alignItems: 'center',
  },
  followButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});