import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Typography } from '../../components/atoms/Typography';
import { Loader } from '../../components/atoms/Loader';
import Icon from 'react-native-vector-icons/Ionicons';
import { searchService } from '../../services/searchService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type Post = {
  id: number;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
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
};

const SearchResults = () => {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const { query } = route.params;

  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'people' | 'posts'>('people');
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<any>();

  // Navigate to user profile
  const goToUserProfile = (user: User) => {
    navigation.navigate('OtherUserProfile', {
      userId: user.id,
      username: user.username,
      displayName: user.firstName
        ? `${user.firstName} ${user.lastName}`
        : user.username,
      avatarUrl: user.profilePhoto,
      isVerified: false,
    });
  };

  // Navigate to reel viewer with proper index
  const goToReel = (post: Post) => {
    const postIndex = posts.findIndex(p => p.id === post.id);
    navigation.navigate('PostViewer', {
      posts,
      initialIndex: postIndex,
      username: post.creator.username,
    });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await searchService.search(query);
        setUsers(res.people);
        setPosts(res.posts);
      } catch (err) {
        console.log('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  if (loading) {
    return (
      <Screen padding>
        <View style={[styles.loader, { backgroundColor: colors.background }]}>
          <Loader size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padding>
      {/* Header with back button */}
      <View style={[styles.header, { marginBottom: 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Typography style={[styles.queryText, { color: colors.text }]}>
          Results for "{query}"
        </Typography>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setTab('people')} style={styles.tab}>
          <Typography
            style={[
              styles.tabText,
              { color: tab === 'people' ? colors.primary : colors.textSecondary },
            ]}
          >
            People
          </Typography>
          {tab === 'people' && (
            <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setTab('posts')} style={styles.tab}>
          <Typography
            style={[
              styles.tabText,
              { color: tab === 'posts' ? colors.primary : colors.textSecondary },
            ]}
          >
            Reels
          </Typography>
          {tab === 'posts' && (
            <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* PEOPLE TAB */}
      {tab === 'people' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {users.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="people-outline" size={48} color={colors.textSecondary} />
              <Typography style={[styles.emptyText, { color: colors.textSecondary }]}>
                No users found
              </Typography>
            </View>
          ) : (
            users.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={[styles.userCard, { backgroundColor: colors.surface }]}
                onPress={() => goToUserProfile(user)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: user.profilePhoto || 'https://via.placeholder.com/100' }}
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <Typography style={[styles.name, { color: colors.text }]}>
                    {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
                  </Typography>
                  <Typography style={[styles.username, { color: colors.textSecondary }]}>
                    @{user.username}
                  </Typography>
                  {user.bio ? (
                    <Typography
                      numberOfLines={2}
                      style={[styles.bio, { color: colors.textSecondary }]}
                    >
                      {user.bio}
                    </Typography>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* POSTS TAB */}
      {tab === 'posts' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="videocam-outline" size={48} color={colors.textSecondary} />
              <Typography style={[styles.emptyText, { color: colors.textSecondary }]}>
                No reels found
              </Typography>
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  onPress={() => goToReel(post)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: post.thumbnailUrl }} style={styles.thumbnail} />
                  <View style={[styles.durationBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <Typography style={styles.durationText}>
                      {formatDuration(post.duration)}
                    </Typography>
                  </View>
                  <Typography numberOfLines={2} style={[styles.postTitle, { color: colors.text }]}>
                    {post.title}
                  </Typography>
                  <View style={styles.postMeta}>
                    <Typography style={[styles.creator, { color: colors.textSecondary }]}>
                      @{post.creator.username}
                    </Typography>
                    <Typography style={[styles.views, { color: colors.textSecondary }]}>
                      {formatCount(post.views)} views
                    </Typography>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  queryText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 3,
    width: '60%',
    borderRadius: 3,
  },
  userCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    marginBottom: 4,
  },
  bio: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  postCard: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  thumbnail: {
    width: '100%',
    height: CARD_WIDTH * 1.3,
    borderRadius: 16,
    marginBottom: 8,
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creator: {
    fontSize: 12,
  },
  views: {
    fontSize: 12,
  },
});

export default SearchResults;