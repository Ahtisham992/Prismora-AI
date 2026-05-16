import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { useTheme } from '../../hooks/useTheme';
import { notificationsService } from '../../services/notificationsService';

type NotificationItem = {
  id: number;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'COMMENT_LIKE';
  isRead: boolean;
  createdAt: string;
  actor: {
    id: number;
    username: string;
    profilePhoto?: string;
  };
  post?: {
    id: number;
    thumbnailUrl?: string;
  };
};

const NotificationsScreen = () => {
  const { colors, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // -----------------------------------------------------------
  // 📥 FETCH NOTIFICATIONS
  // -----------------------------------------------------------
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsService.getAll();
      setNotifications(data);
    } catch (err) {
      console.log('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // -----------------------------------------------------------
  // ✅ MARK AS READ
  // -----------------------------------------------------------
  const handleRead = async (id: number) => {
    await notificationsService.markAsRead(id);

    setNotifications(prev =>
      prev.map(n =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
    );
  };

  // -----------------------------------------------------------
  // 🧠 MESSAGE BUILDER
  // -----------------------------------------------------------
  const getMessage = (item: NotificationItem) => {
    switch (item.type) {
      case 'LIKE':
        return `${item.actor.username} liked your post`;
      case 'COMMENT':
        return `${item.actor.username} commented on your post`;
      case 'FOLLOW':
        return `${item.actor.username} started following you`;
      case 'COMMENT_LIKE':
        return `${item.actor.username} liked your comment`;
      default:
        return 'New notification';
    }
  };

  // -----------------------------------------------------------
  // 🎨 ITEM RENDER
  // -----------------------------------------------------------
  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      onPress={() => handleRead(item.id)}
      style={[
        styles.card,
        {
          backgroundColor: item.isRead
            ? colors.surface
            : colors.primary + '10',
          borderColor: colors.border,
        },
      ]}
    >
      {/* Avatar */}
      <Image
        source={{
          uri: item.actor.profilePhoto || 'https://i.pravatar.cc/100',
        }}
        style={styles.avatar}
      />

      {/* Text */}
      <View style={styles.content}>
        <Text style={[styles.message, { color: colors.text }]}>
          {getMessage(item)}
        </Text>

        <Text style={[styles.time, { color: colors.text + '80' }]}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>

      {/* Post thumbnail */}
      {item.post?.thumbnailUrl && (
        <Image
          source={{ uri: item.post.thumbnailUrl }}
          style={styles.thumbnail}
        />
      )}

      {/* Unread dot */}
      {!item.isRead && (
        <View
          style={[
            styles.unreadDot,
            { backgroundColor: colors.primary },
          ]}
        />
      )}
    </TouchableOpacity>
  );

  // -----------------------------------------------------------
  // 🔥 DIVIDER
  // -----------------------------------------------------------
  const Divider = () => {
    return (
      <View
        style={{
          height: 1,
          backgroundColor: colors.border,
          marginVertical: 6,
          opacity: 0.5,
        }}
      />
    );
  };

  // -----------------------------------------------------------
  // 🚫 EMPTY STATE
  // -----------------------------------------------------------
  const EmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="notifications-off-outline"
          size={70}
          color={colors.text + '40'}
        />

        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No Notifications Yet
        </Text>

        <Text
          style={[
            styles.emptySubtitle,
            { color: colors.text + '70' },
          ]}
        >
          When something happens, you’ll see it here
        </Text>
      </View>
    );
  };

  // -----------------------------------------------------------
  // 🔄 LOADING
  // -----------------------------------------------------------
  if (loading) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* HEADER */}
      <Header title="Notifications" />

      {/* LIST */}
      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={[
          styles.list,
          notifications.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
};

export default NotificationsScreen;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,

    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },

  content: {
    flex: 1,
  },

  message: {
    fontSize: 14,
    fontWeight: '500',
  },

  time: {
    fontSize: 12,
    marginTop: 2,
  },

  thumbnail: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginLeft: 10,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ---------------- EMPTY STATE ----------------
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
  },

  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
  },
});