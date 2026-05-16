import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Typography } from '../../components/atoms/Typography';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { userService } from '../../services/userService';

type RouteParams = {
  Followers: {
    initialTab?: 'followers' | 'following';
    username: string;
    userId: number;
  };
};

type ApiUser = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  bio?: string;
};

const FollowersScreen = () => {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'Followers'>>();

  const userId = route.params?.userId;

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(
    route.params?.initialTab || 'followers'
  );

  const [followers, setFollowers] = useState<ApiUser[]>([]);
  const [following, setFollowing] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followStates, setFollowStates] = useState<{ [key: number]: boolean }>({});

  // ---------------------------
  // FETCH DATA
  // ---------------------------

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);

      const { data } = await userService.getUserConnections(userId);

      setFollowers(data.followers);
      setFollowing(data.following);

      // initialize follow states (default true for following tab)
      const initialState: any = {};
      data.following.forEach((u: ApiUser) => {
        initialState[u.id] = true;
      });

      setFollowStates(initialState);
    } catch (err) {
      console.log('Error fetching connections:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // FOLLOW TOGGLE (REAL API)
  // ---------------------------

  const handleFollowToggle = async (userId: number) => {
    const isFollowing = followStates[userId];

    try {
      if (isFollowing) {
        await userService.unfollowUser(userId);
      } else {
        await userService.followUser(userId);
      }

      setFollowStates((prev) => ({
        ...prev,
        [userId]: !isFollowing,
      }));
    } catch (err) {
      console.log('Follow error:', err);
    }
  };

  // ---------------------------
  // NAVIGATE TO USER PROFILE
  // ---------------------------
  const goToUserProfile = (user: ApiUser) => {
    navigation.navigate('OtherUserProfile', {
      userId: user.id,
      username: user.username,
      displayName: user.firstName
        ? `${user.firstName} ${user.lastName}`
        : user.username,
      avatarUrl: user.profilePhoto,
      isVerified: false, // or whatever logic you have for verified
    });
  };

  // ---------------------------
  // RENDER USER
  // ---------------------------

  const renderUserItem = ({ item }: { item: ApiUser }) => {
    const isFollowing = followStates[item.id];

    return (
      <View style={[styles.userItem, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => goToUserProfile(item)} // <-- added navigation
        >
          <Image
            source={{
              uri:
                item.profilePhoto ||
                'https://via.placeholder.com/100',
            }}
            style={styles.avatar}
          />

          <View style={styles.userDetails}>
            <Typography
              variant="body"
              style={[styles.displayName, { color: colors.text }]}
            >
              {item.firstName} {item.lastName}
            </Typography>

            <Typography
              variant="caption"
              style={{ color: colors.textSecondary }}
            >
              @{item.username}
            </Typography>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing
              ? { backgroundColor: 'transparent', borderColor: colors.primary }
              : { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => handleFollowToggle(item.id)}
        >
          <Typography
            variant="small"
            style={{
              color: isFollowing ? colors.primary : '#fff',
              fontWeight: '600',
            }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Typography>
        </TouchableOpacity>
      </View>
    );
  };

  const currentList = activeTab === 'followers' ? followers : following;

  // ---------------------------
  // LOADING STATE
  // ---------------------------

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ---------------------------
  // UI
  // ---------------------------

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header — safe-area aware so back arrow clears status bar */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Typography style={{ color: colors.text, fontWeight: '600' }}>
          {route.params?.username}
        </Typography>

        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['followers', 'following'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomColor: colors.primary },
            ]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Typography
              style={{
                color:
                  activeTab === tab ? colors.primary : colors.textSecondary,
              }}
            >
              {tab}
            </Typography>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={currentList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
  },
  listContent: {
    paddingTop: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 13,
  },
  separator: {
    fontSize: 13,
  },
  followers: {
    fontSize: 13,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 90,
    alignItems: 'center',
  },
  followButtonText: {
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FollowersScreen;