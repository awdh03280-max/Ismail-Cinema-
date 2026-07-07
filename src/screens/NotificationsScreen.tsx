/**
 * NotificationsScreen — follow activity feed.
 * Shows recent followers with timestamps and follow-back buttons.
 * Marks all as read on mount.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFollow } from '../context/FollowContext';
import { colors } from '../theme/colors';
import FollowButton from '../components/FollowButton';
import { NotificationDoc } from '../types/social';

interface Props {
  navigation: any;
}

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const formatTime = (ms: number): string => {
  // Guard against missing/zero timestamps (Firestore doc not yet written)
  if (!ms || ms < 1_000_000) return '';
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const NotificationRow: React.FC<{
  notif: NotificationDoc;
  onPress: () => void;
  animDelay: number;
}> = ({ notif, onPress, animDelay }) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 320, delay: animDelay, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 320, delay: animDelay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: opacityAnim }}>
      <TouchableOpacity
        style={[styles.row, !notif.read && styles.rowUnread]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Unread dot */}
        {!notif.read && <View style={styles.unreadDot} />}

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {notif.fromPhotoURL ? (
            <Image source={{ uri: notif.fromPhotoURL }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={['#1a1200', '#0d0d0d']} style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials(notif.fromDisplayName)}</Text>
            </LinearGradient>
          )}
          <View style={styles.notifTypeBadge}>
            <Ionicons name="person-add" size={9} color="#fff" />
          </View>
        </View>

        {/* Text */}
        <View style={styles.textBlock}>
          <Text style={styles.notifText} numberOfLines={2}>
            <Text style={styles.notifName}>{notif.fromDisplayName}</Text>
            {' started following you'}
          </Text>
          <Text style={styles.notifTime}>{formatTime(notif.createdAt)}</Text>
        </View>

        {/* Follow back */}
        <FollowButton
          targetUid={notif.fromUid}
          targetDisplayName={notif.fromDisplayName}
          targetPhotoURL={notif.fromPhotoURL}
          size="sm"
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { notifications, markNotificationsRead, unreadCount } = useFollow();
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    // Mark all as read when screen opens
    markNotificationsRead();
  }, []);

  const renderHeader = () => (
    <Animated.View style={[styles.headerWrap, { opacity: headerAnim }]}>
      <LinearGradient colors={['#1a1200', '#0d0d0d']} style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="notifications" size={22} color={colors.gold} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Activity</Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000', '#0a0a0a', '#000']} style={StyleSheet.absoluteFill} />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <NotificationRow
            notif={item}
            animDelay={index * 40}
            onPress={() =>
              navigation.push('PublicProfile', {
                uid: item.fromUid,
                displayName: item.fromDisplayName,
                photoURL: item.fromPhotoURL,
              })
            }
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={52} color="#333" />
            <Text style={styles.emptyTitle}>No Activity Yet</Text>
            <Text style={styles.emptySub}>
              You'll see follow notifications here.
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  list: { paddingBottom: 60 },

  headerWrap: { padding: 16, paddingBottom: 8 },
  headerCard: {
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(212,175,55,0.08)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: colors.gold, fontWeight: '600', marginTop: 1 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    position: 'relative',
  },
  rowUnread: { backgroundColor: 'rgba(212,175,55,0.04)' },
  unreadDot: {
    position: 'absolute',
    left: 4,
    top: '50%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
    marginTop: -3,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: colors.goldMuted,
  },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.goldMuted,
  },
  avatarText: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  notifTypeBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.red,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#000',
  },
  textBlock: { flex: 1 },
  notifText: { fontSize: 13, color: '#ccc', lineHeight: 18 },
  notifName: { fontWeight: '700', color: '#fff' },
  notifTime: { fontSize: 11, color: '#555', marginTop: 3 },
  separator: { height: 1, backgroundColor: '#111', marginLeft: 76 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  emptySub: { fontSize: 13, color: '#555', textAlign: 'center', paddingHorizontal: 40 },
});

export default NotificationsScreen;
