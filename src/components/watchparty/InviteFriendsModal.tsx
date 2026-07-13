/**
 * InviteFriendsModal — invite friends to a Watch Party from inside the app.
 * Lists the people the host follows and lets them send an in-app invite
 * notification (no OS share sheet involved).
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { fetchFollowing, sendWatchPartyInvite } from '../../context/FollowContext';
import { FollowUser } from '../../types/social';

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

interface Props {
  visible: boolean;
  onClose: () => void;
  partyId: string;
  partyCode: string;
  movieId: string;
  movieTitle: string;
  moviePoster: string;
  contentType: 'movie' | 'tv';
}

const InviteFriendsModal: React.FC<Props> = ({
  visible,
  onClose,
  partyId,
  partyCode,
  movieId,
  movieTitle,
  moviePoster,
  contentType,
}) => {
  const { user, userProfile } = useAuth();
  const [friends, setFriends] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible || !user) return;
    setLoading(true);
    fetchFollowing(user.uid)
      .then(setFriends)
      .finally(() => setLoading(false));
  }, [visible, user?.uid]);

  const handleInvite = async (friend: FollowUser) => {
    if (!user || !userProfile) return;
    setInvited((prev) => new Set(prev).add(friend.uid));
    try {
      await sendWatchPartyInvite({
        fromUid: user.uid,
        fromDisplayName: userProfile.displayName,
        fromPhotoURL: userProfile.photoURL ?? null,
        toUid: friend.uid,
        partyId,
        partyCode,
        movieId,
        movieTitle,
        moviePoster,
        contentType,
      });
    } catch (err) {
      console.error('[InviteFriendsModal] invite error:', err);
      setInvited((prev) => {
        const next = new Set(prev);
        next.delete(friend.uid);
        return next;
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Invite Friends</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#aaa" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sub}>Invite anyone you follow to join this Watch Party.</Text>

          {loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 30 }} />
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(f) => f.uid}
              style={{ maxHeight: 360 }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={32} color="#333" />
                  <Text style={styles.emptyText}>
                    You're not following anyone yet. Follow friends from their profile to invite them.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isInvited = invited.has(item.uid);
                return (
                  <View style={styles.row}>
                    {item.photoURL ? (
                      <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                    ) : (
                      <LinearGradient colors={['#1a1200', '#0d0d0d']} style={styles.avatarFallback}>
                        <Text style={styles.avatarInitials}>{initials(item.displayName)}</Text>
                      </LinearGradient>
                    )}
                    <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
                    <TouchableOpacity
                      style={[styles.inviteBtn, isInvited && styles.inviteBtnDone]}
                      onPress={() => handleInvite(item)}
                      disabled={isInvited}
                    >
                      <Ionicons
                        name={isInvited ? 'checkmark' : 'paper-plane-outline'}
                        size={14}
                        color={isInvited ? '#2db52d' : colors.gold}
                      />
                      <Text style={[styles.inviteBtnText, isInvited && styles.inviteBtnTextDone]}>
                        {isInvited ? 'Invited' : 'Invite'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0c0c0c',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  closeBtn: { padding: 4 },
  sub: { color: '#777', fontSize: 12, marginBottom: 14 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: colors.goldMuted },
  avatarFallback: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.goldMuted,
  },
  avatarInitials: { color: colors.gold, fontWeight: '800', fontSize: 14 },
  name: { flex: 1, color: '#eee', fontSize: 14, fontWeight: '600' },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)',
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  inviteBtnDone: { borderColor: 'rgba(45,181,45,0.4)', backgroundColor: 'rgba(45,181,45,0.08)' },
  inviteBtnText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  inviteBtnTextDone: { color: '#2db52d' },

  empty: { alignItems: 'center', paddingVertical: 30, gap: 10, paddingHorizontal: 20 },
  emptyText: { color: '#555', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});

export default InviteFriendsModal;
