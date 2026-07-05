/**
 * UserCard — premium card for displaying a user in followers/following lists.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFollow } from '../context/FollowContext';
import { colors } from '../theme/colors';
import FollowButton from './FollowButton';
import { FollowUser } from '../types/social';

interface UserCardProps {
  user: FollowUser;
  currentUid: string;
  onPress?: () => void;
  animDelay?: number;
}

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const formatTime = (ms: number): string => {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const UserCard: React.FC<UserCardProps> = ({ user, currentUid, onPress, animDelay = 0 }) => {
  const { isFollowing, followingIds } = useFollow();

  const isSelf = user.uid === currentUid;
  const following = isFollowing(user.uid);
  // Mutual: I follow them AND they appear in my followingIds — but we can't know
  // if they follow me without another query. Show "Mutual" only from followingIds context.
  const mutual = following; // simplified — true mutual detection in PublicProfileScreen

  const slideAnim = React.useRef(new Animated.Value(30)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: animDelay,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: animDelay,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={onPress ? 0.75 : 1}
        disabled={!onPress}
      >
        <LinearGradient
          colors={['#111', '#0d0d0d']}
          style={styles.gradient}
        >
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={['#1a1200', '#0d0d0d']}
                style={styles.avatarFallback}
              >
                <Text style={styles.avatarText}>{initials(user.displayName)}</Text>
              </LinearGradient>
            )}
            {following && !isSelf && (
              <View style={styles.followingDot} />
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {user.displayName}
              {isSelf && (
                <Text style={styles.youBadge}> (You)</Text>
              )}
            </Text>
            <Text style={styles.time}>{formatTime(user.followedAt)}</Text>
          </View>

          {/* Follow button (hide for self) */}
          {!isSelf && (
            <FollowButton
              targetUid={user.uid}
              targetDisplayName={user.displayName}
              targetPhotoURL={user.photoURL}
              size="sm"
            />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginBottom: 8 },
  card: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#1e1e1e' },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: colors.goldMuted,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.goldMuted,
  },
  avatarText: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  followingDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: '#0d0d0d',
  },
  info: { flex: 1 },
  name: { color: '#fff', fontWeight: '700', fontSize: 14 },
  youBadge: { color: '#666', fontWeight: '400', fontSize: 12 },
  time: { color: '#666', fontSize: 11, marginTop: 2 },
});

export default UserCard;
