/**
 * FollowButton — reusable follow / following / mutual indicator button.
 * Gold when following, outlined when not.
 */
import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFollow } from '../context/FollowContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface FollowButtonProps {
  targetUid: string;
  targetDisplayName: string;
  targetPhotoURL: string | null;
  isMutual?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onFollowChange?: (nowFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  targetUid,
  targetDisplayName,
  targetPhotoURL,
  isMutual = false,
  size = 'md',
  onFollowChange,
}) => {
  const { isFollowing, follow, unfollow } = useFollow();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const following = isFollowing(targetUid);
  // Hard block: never render a follow button for yourself
  if (user?.uid === targetUid) return null;

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (following) {
        await unfollow(targetUid);
        onFollowChange?.(false);
      } else {
        await follow({ uid: targetUid, displayName: targetDisplayName, photoURL: targetPhotoURL });
        onFollowChange?.(true);
      }
    } catch {
      // error already logged in context
    } finally {
      setLoading(false);
    }
  };

  const sizeStyles = SIZE_MAP[size];

  if (loading) {
    return (
      <View style={[styles.base, sizeStyles.btn, styles.loading]}>
        <ActivityIndicator size="small" color={colors.gold} />
      </View>
    );
  }

  if (following) {
    return (
      <TouchableOpacity
        style={[styles.base, sizeStyles.btn, styles.followingBtn]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark" size={sizeStyles.iconSize} color={colors.gold} />
        <Text style={[styles.followingText, sizeStyles.text]}>
          {isMutual ? 'Mutual' : 'Following'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.base, sizeStyles.btn]} onPress={handlePress} activeOpacity={0.8}>
      <LinearGradient
        colors={['#e50914', '#c0070e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, sizeStyles.btn]}
      >
        <Ionicons name="person-add-outline" size={sizeStyles.iconSize} color="#fff" />
        <Text style={[styles.followText, sizeStyles.text]}>Follow</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const SIZE_MAP = {
  sm: { btn: { height: 30, paddingHorizontal: 12, borderRadius: 8 }, text: { fontSize: 11 }, iconSize: 12 },
  md: { btn: { height: 38, paddingHorizontal: 18, borderRadius: 10 }, text: { fontSize: 13 }, iconSize: 14 },
  lg: { btn: { height: 46, paddingHorizontal: 28, borderRadius: 12 }, text: { fontSize: 15 }, iconSize: 16 },
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    height: '100%',
  },
  followText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  followingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  followingText: {
    color: colors.gold,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loading: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
  },
});

export default FollowButton;
