/**
 * FollowingScreen — shows the list of users that a given user follows.
 * Real-time, with follow/unfollow buttons on each card.
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { query, collection, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import UserCard from '../components/UserCard';
import { FollowDoc, FollowUser } from '../types/social';

interface Props {
  route: { params: { uid: string; displayName: string } };
  navigation: any;
}

const FollowingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { uid, displayName } = route.params;
  const { user } = useAuth();
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();

    const q = query(collection(db, 'follows'), where('followerId', '==', uid));
    const unsub = onSnapshot(q, (snap) => {
      const list: FollowUser[] = snap.docs
        .map((d) => {
          const data = d.data() as FollowDoc;
          return {
            uid: data.followingId,
            displayName: data.followingDisplayName,
            photoURL: data.followingPhotoURL,
            followedAt: data.createdAt,
          };
        })
        .sort((a, b) => b.followedAt - a.followedAt);
      setFollowing(list);
      setIsLoading(false);
    }, (err) => {
      console.error('[Following] onSnapshot error:', err);
      setIsLoading(false);
    });

    return unsub;
  }, [uid]);

  const renderHeader = () => (
    <Animated.View style={[styles.listHeader, { opacity: headerAnim }]}>
      <LinearGradient colors={['#0a0014', '#0d0d0d']} style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconBox}>
            <Ionicons name="person-add" size={20} color={colors.red} />
          </View>
          <View>
            <Text style={styles.headerCount}>{following.length}</Text>
            <Text style={styles.headerSub}>Following</Text>
          </View>
        </View>
        <Text style={styles.headerName} numberOfLines={1}>
          {uid === user?.uid ? 'Who You Follow' : `Who ${displayName.split(' ')[0]} Follows`}
        </Text>
      </LinearGradient>
    </Animated.View>
  );

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
      <FlatList
        data={following}
        keyExtractor={(item) => item.uid}
        renderItem={({ item, index }) => (
          <UserCard
            user={item}
            currentUid={user?.uid ?? ''}
            animDelay={index * 35}
            onPress={() =>
              navigation.push('PublicProfile', {
                uid: item.uid,
                displayName: item.displayName,
                photoURL: item.photoURL,
              })
            }
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="person-add-outline" size={48} color="#333" />
            <Text style={styles.emptyTitle}>Not Following Anyone</Text>
            <Text style={styles.emptySub}>
              {uid === user?.uid
                ? 'Follow users to see them here.'
                : `${displayName.split(' ')[0]} isn't following anyone yet.`}
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 60 },

  listHeader: { padding: 16, paddingBottom: 8 },
  headerCard: {
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(229,9,20,0.3)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  headerIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(229,9,20,0.08)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(229,9,20,0.3)',
  },
  headerCount: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 30 },
  headerSub: { fontSize: 12, color: '#666', fontWeight: '600' },
  headerName: { fontSize: 13, color: colors.red, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  emptySub: { fontSize: 13, color: '#555', textAlign: 'center', paddingHorizontal: 40 },
});

export default FollowingScreen;
