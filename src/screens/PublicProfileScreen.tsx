/**
 * PublicProfileScreen — another user's profile with follow/unfollow.
 * Shows followers, following counts, mutual indicator, and recent activity.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useFollow, fetchFollowingIds } from '../context/FollowContext';
import { colors } from '../theme/colors';
import FollowButton from '../components/FollowButton';

interface Props {
  route: { params: { uid: string; displayName: string; photoURL?: string | null } };
  navigation: any;
}

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const PublicProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { uid, displayName, photoURL } = route.params;
  const { user } = useAuth();
  const { isFollowing, followingIds, follow, unfollow } = useFollow();

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [theirFollowingIds, setTheirFollowingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  const isSelf = user?.uid === uid;
  const amFollowing = isFollowing(uid);
  // Mutual: I follow them AND they follow me
  const isMutual = amFollowing && theirFollowingIds.has(user?.uid ?? '');
  // They follow me
  const theyFollowMe = theirFollowingIds.has(user?.uid ?? '');

  useEffect(() => {
    StatusBar.setBarStyle('light-content');

    Animated.stagger(120, [
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(statsAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
    ]).start();

    // Real-time followers count
    const unsubFollowers = onSnapshot(
      query(collection(db, 'follows'), where('followingId', '==', uid)),
      (snap) => { setFollowersCount(snap.size); setIsLoading(false); },
      (err) => { console.error('[PublicProfile] followers listener error:', err); setIsLoading(false); }
    );
    // Real-time following count
    const unsubFollowing = onSnapshot(
      query(collection(db, 'follows'), where('followerId', '==', uid)),
      (snap) => { setFollowingCount(snap.size); },
      (err) => { console.error('[PublicProfile] following listener error:', err); }
    );

    // Their following ids (for mutual detection)
    fetchFollowingIds(uid).then(setTheirFollowingIds);

    return () => { unsubFollowers(); unsubFollowing(); };
  }, [uid]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000', '#0a0a0a', '#000']} style={StyleSheet.absoluteFill} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Hero header ─────────────────────────────────────────────────── */}
        <Animated.View style={[styles.hero, { opacity: headerAnim }]}>
          <LinearGradient
            colors={['#1a1200', '#0d0d0d', '#000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Avatar */}
            <View style={styles.avatarRing}>
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={['#1a1200', '#0d0d0d']} style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials(displayName)}</Text>
                </LinearGradient>
              )}
              {isMutual && (
                <View style={styles.mutualBadge}>
                  <Ionicons name="people" size={10} color="#000" />
                </View>
              )}
            </View>

            <Text style={styles.name}>{displayName}</Text>

            {/* Tags */}
            <View style={styles.tagRow}>
              {theyFollowMe && !isMutual && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Follows you</Text>
                </View>
              )}
              {isMutual && (
                <View style={[styles.tag, styles.mutualTag]}>
                  <Ionicons name="people-outline" size={11} color={colors.gold} />
                  <Text style={[styles.tagText, styles.mutualTagText]}>Mutual</Text>
                </View>
              )}
            </View>

            {/* Follow button */}
            {!isSelf && (
              <View style={styles.followBtnWrap}>
                <FollowButton
                  targetUid={uid}
                  targetDisplayName={displayName}
                  targetPhotoURL={photoURL ?? null}
                  isMutual={isMutual}
                  size="lg"
                />
              </View>
            )}
          </LinearGradient>

          {/* Gold accent line */}
          <View style={styles.heroLine} />
        </Animated.View>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <Animated.View style={[styles.statsRow, { opacity: statsAnim }]}>
          <TouchableOpacity
            style={styles.statBox}
            onPress={() => navigation.push('FollowersScreen', { uid, displayName })}
            activeOpacity={0.75}
          >
            <Text style={styles.statCount}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statBox}
            onPress={() => navigation.push('FollowingScreen', { uid, displayName })}
            activeOpacity={0.75}
          >
            <Text style={styles.statCount}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Mutual followers note ────────────────────────────────────────── */}
        {isMutual && (
          <View style={styles.mutualNote}>
            <Ionicons name="people-outline" size={16} color={colors.gold} />
            <Text style={styles.mutualNoteText}>
              You and {displayName.split(' ')[0]} follow each other
            </Text>
          </View>
        )}

        {/* ── Footer note for self ─────────────────────────────────────────── */}
        {isSelf && (
          <View style={styles.selfNote}>
            <Ionicons name="person-circle-outline" size={18} color="#555" />
            <Text style={styles.selfNoteText}>This is your own profile</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 60 },

  hero: { margin: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)' },
  heroGradient: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  heroLine: { height: 2, backgroundColor: colors.gold, opacity: 0.5, marginHorizontal: 30 },

  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: colors.gold,
    marginBottom: 14, overflow: 'hidden', position: 'relative',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { color: colors.gold, fontWeight: '900', fontSize: 32 },
  mutualBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#000',
  },

  name: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },

  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap', justifyContent: 'center' },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1a1a1a', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#333',
  },
  tagText: { fontSize: 11, color: '#888', fontWeight: '600' },
  mutualTag: { borderColor: 'rgba(212,175,55,0.4)', backgroundColor: 'rgba(212,175,55,0.08)' },
  mutualTagText: { color: colors.gold },

  followBtnWrap: { width: 180 },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  statCount: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 32 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#1e1e1e', marginVertical: 12 },

  mutualNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: 'rgba(212,175,55,0.06)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  mutualNoteText: { color: colors.gold, fontSize: 12, fontWeight: '600', flex: 1 },

  selfNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'center', marginTop: 20,
  },
  selfNoteText: { color: '#555', fontSize: 12 },
});

export default PublicProfileScreen;
