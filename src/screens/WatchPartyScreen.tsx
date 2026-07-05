/**
 * WatchPartyScreen — real-time watch party powered by Firestore.
 *
 * Features:
 *  - Create a party for any movie and share a 6-character code
 *  - Join an existing party by entering a code
 *  - Real-time member presence with avatars
 *  - Host controls: start party → all members get a "Watch Now" push
 *  - Ready/unready toggle for guests
 *  - Chat within the party
 *  - Premium Black + Gold + Red design
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ND } from '../utils/animation';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PartyMember {
  uid: string;
  displayName: string;
  photoURL: string | null;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
}

interface PartyDoc {
  id: string;
  code: string;
  hostUid: string;
  movieId: string;
  movieTitle: string;
  moviePoster: string;
  contentType: 'movie' | 'tv';
  status: 'waiting' | 'watching' | 'ended';
  createdAt: number;
}

interface ChatMessage {
  id: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  text: string;
  createdAt: Timestamp | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const formatTime = (ts: Timestamp | null): string => {
  if (!ts) return '';
  const ms = Date.now() - ts.toMillis();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const MemberAvatar: React.FC<{ member: PartyMember }> = ({ member }) => (
  <View style={avatarStyles.wrap}>
    {member.photoURL ? (
      <Image source={{ uri: member.photoURL }} style={avatarStyles.img} />
    ) : (
      <LinearGradient colors={['#1a1200', '#111']} style={avatarStyles.fallback}>
        <Text style={avatarStyles.initials}>{initials(member.displayName)}</Text>
      </LinearGradient>
    )}
    {member.isHost && (
      <View style={avatarStyles.hostBadge}>
        <Ionicons name="star" size={8} color="#000" />
      </View>
    )}
    {member.isReady && !member.isHost && (
      <View style={avatarStyles.readyBadge}>
        <Ionicons name="checkmark" size={8} color="#fff" />
      </View>
    )}
    <Text style={avatarStyles.name} numberOfLines={1}>{member.displayName.split(' ')[0]}</Text>
  </View>
);

const avatarStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4, width: 64 },
  img: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.gold },
  fallback: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.goldMuted,
  },
  initials: { color: colors.gold, fontWeight: '800', fontSize: 18 },
  hostBadge: {
    position: 'absolute', top: -2, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.gold,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#000',
  },
  readyBadge: {
    position: 'absolute', bottom: 16, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#2db52d',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#000',
  },
  name: { color: '#aaa', fontSize: 10, fontWeight: '600', maxWidth: 60, textAlign: 'center' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

interface Props {
  route: { params?: { movieId?: string; movieTitle?: string; moviePoster?: string; contentType?: 'movie' | 'tv' } };
  navigation: any;
}

type Screen = 'home' | 'lobby' | 'join';

const WatchPartyScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user, userProfile } = useAuth();
  const params = route.params ?? {};

  const [screen, setScreen] = useState<Screen>('home');
  const [partyId, setPartyId] = useState<string | null>(null);
  const [party, setParty] = useState<PartyDoc | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  const unsubParty = useRef<(() => void) | null>(null);
  const unsubMembers = useRef<(() => void) | null>(null);
  const unsubChat = useRef<(() => void) | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') StatusBar.setBackgroundColor('#000000');
    return () => {
      unsubParty.current?.();
      unsubMembers.current?.();
      unsubChat.current?.();
    };
  }, []);

  // Auto-navigate ALL members (host + guests) when party status → 'watching'
  useEffect(() => {
    if (party?.status === 'watching' && screen === 'lobby' && party.movieId) {
      navigation.navigate('Player', {
        movieId: party.movieId,
        title: party.movieTitle,
        poster: party.moviePoster,
        contentType: party.contentType,
      });
    }
  }, [party?.status, screen]);

  // Pulse animation for the code badge
  useEffect(() => {
    if (party?.status === 'waiting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: ND }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: ND }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [party?.status]);

  const subscribeToParty = useCallback((pid: string) => {
    // Party doc
    unsubParty.current = onSnapshot(doc(db, 'watchParties', pid), (snap) => {
      if (snap.exists()) setParty({ id: snap.id, ...(snap.data() as any) });
    });
    // Members
    unsubMembers.current = onSnapshot(
      collection(db, 'watchParties', pid, 'members'),
      (snap) => {
        const ms: PartyMember[] = snap.docs.map((d) => ({ ...(d.data() as any) }));
        ms.sort((a, b) => (a.isHost ? -1 : 1) - (b.isHost ? -1 : 1) || a.joinedAt - b.joinedAt);
        setMembers(ms);
      }
    );
    // Chat
    const chatQ = query(collection(db, 'watchParties', pid, 'chat'), orderBy('createdAt', 'asc'));
    unsubChat.current = onSnapshot(chatQ, (snap) => {
      const msgs: ChatMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }, []);

  const handleCreateParty = async () => {
    if (!user || !userProfile) return;
    if (!params.movieId) {
      Alert.alert('Select a Movie', 'Please go to a movie detail page and tap "Watch Party" to create a party for a specific movie.');
      return;
    }
    setCreating(true);
    try {
      const code = generateCode();
      const partyRef = await addDoc(collection(db, 'watchParties'), {
        code,
        hostUid: user.uid,
        movieId: params.movieId,
        movieTitle: params.movieTitle ?? '',
        moviePoster: params.moviePoster ?? '',
        contentType: params.contentType ?? 'movie',
        status: 'waiting',
        createdAt: Date.now(),
      });
      // Add host as member
      await setDoc(doc(db, 'watchParties', partyRef.id, 'members', user.uid), {
        uid: user.uid,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL ?? null,
        isHost: true,
        isReady: true,
        joinedAt: Date.now(),
      });
      setPartyId(partyRef.id);
      subscribeToParty(partyRef.id);
      setScreen('lobby');
    } catch (err) {
      console.error('[WatchParty] create error:', err);
      Alert.alert('Error', 'Failed to create party. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinParty = async () => {
    if (!user || !userProfile) return;
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) {
      Alert.alert('Invalid Code', 'Enter the 6-character party code.');
      return;
    }
    setJoining(true);
    try {
      // Find party by code
      const q = query(collection(db, 'watchParties'), where('code', '==', code), where('status', '!=', 'ended'));
      const snap = await getDocs(q);
      if (snap.empty) {
        Alert.alert('Party Not Found', 'No active party found with that code. Check the code and try again.');
        setJoining(false);
        return;
      }
      const partySnap = snap.docs[0];
      const pid = partySnap.id;
      // Join as member
      await setDoc(doc(db, 'watchParties', pid, 'members', user.uid), {
        uid: user.uid,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL ?? null,
        isHost: false,
        isReady: false,
        joinedAt: Date.now(),
      });
      setPartyId(pid);
      subscribeToParty(pid);
      setScreen('lobby');
    } catch (err) {
      console.error('[WatchParty] join error:', err);
      Alert.alert('Error', 'Failed to join party. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveParty = async () => {
    if (!user || !partyId) return;
    Alert.alert(
      'Leave Party',
      'Are you sure you want to leave this watch party?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'watchParties', partyId, 'members', user.uid));
              if (party?.hostUid === user.uid) {
                await updateDoc(doc(db, 'watchParties', partyId), { status: 'ended' });
              }
              unsubParty.current?.();
              unsubMembers.current?.();
              unsubChat.current?.();
              setScreen('home');
              setParty(null);
              setMembers([]);
              setMessages([]);
              setPartyId(null);
            } catch (err) {
              console.error('[WatchParty] leave error:', err);
            }
          },
        },
      ]
    );
  };

  const handleToggleReady = async () => {
    if (!user || !partyId) return;
    const next = !isReady;
    setIsReady(next);
    await updateDoc(doc(db, 'watchParties', partyId, 'members', user.uid), { isReady: next });
  };

  const handleStartParty = async () => {
    if (!user || !partyId || !party) return;
    // Explicit host guard — enforced client-side before write
    if (party.hostUid !== user.uid) return;
    const allReady = members.filter(m => !m.isHost).every(m => m.isReady);
    if (!allReady && members.length > 1) {
      Alert.alert(
        'Not Everyone is Ready',
        'Some members are not ready yet. Start anyway?',
        [
          { text: 'Wait', style: 'cancel' },
          { text: 'Start Now', onPress: () => doStartParty() },
        ]
      );
      return;
    }
    doStartParty();
  };

  const doStartParty = async () => {
    if (!partyId || !party || !user) return;
    // Double-check host authorization before write
    if (party.hostUid !== user.uid) return;
    await updateDoc(doc(db, 'watchParties', partyId), { status: 'watching' });
    // Host navigates immediately; guests navigate via the party status listener below
  };

  const handleSendMessage = async () => {
    if (!user || !userProfile || !chatText.trim() || !partyId) return;
    setSendingMsg(true);
    try {
      await addDoc(collection(db, 'watchParties', partyId, 'chat'), {
        uid: user.uid,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL ?? null,
        text: chatText.trim(),
        createdAt: serverTimestamp(),
      });
      setChatText('');
    } catch (err) {
      console.error('[WatchParty] send message error:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleShareCode = async () => {
    if (!party) return;
    await Share.share({
      message: `Join my Watch Party on Ismail Cinema!\nMovie: ${party.movieTitle}\nCode: ${party.code}`,
    });
  };

  const isHost = party?.hostUid === user?.uid;
  const membersReady = members.filter(m => !m.isHost && m.isReady).length;
  const membersTotal = members.filter(m => !m.isHost).length;

  // ── Home screen (create/join) ──────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#000', '#0a0a0a', '#000']} style={StyleSheet.absoluteFill} />
        <ScrollView contentContainerStyle={styles.homeScroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.homeHeader}>
            <LinearGradient
              colors={['rgba(212,175,55,0.12)', 'transparent']}
              style={styles.homeHeaderGlow}
            />
            <View style={styles.homeIconWrap}>
              <LinearGradient colors={['#1a1200', '#0d0d0d']} style={styles.homeIcon}>
                <Ionicons name="people" size={32} color={colors.gold} />
              </LinearGradient>
            </View>
            <Text style={styles.homeTitle}>Watch Party</Text>
            <Text style={styles.homeSub}>
              Watch movies together in real-time{'\n'}with friends and family
            </Text>
          </View>

          {/* Create card */}
          {params.movieId ? (
            <View style={styles.movieSelectedCard}>
              <LinearGradient colors={['#1a1200', '#0d0d0d']} style={styles.movieSelectedGradient}>
                {params.moviePoster ? (
                  <Image source={{ uri: params.moviePoster }} style={styles.movieSelectedPoster} />
                ) : (
                  <View style={[styles.movieSelectedPoster, styles.posterPlaceholder]}>
                    <Ionicons name="film" size={28} color={colors.gold} />
                  </View>
                )}
                <View style={styles.movieSelectedInfo}>
                  <Text style={styles.movieSelectedLabel}>Selected Movie</Text>
                  <Text style={styles.movieSelectedTitle} numberOfLines={2}>{params.movieTitle}</Text>
                  <View style={styles.movieSelectedBadge}>
                    <Text style={styles.movieSelectedType}>
                      {params.contentType === 'tv' ? 'SERIES' : 'MOVIE'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
              <View style={styles.movieSelectedLine} />
            </View>
          ) : (
            <View style={styles.noMovieHint}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={styles.noMovieText}>
                Go to any movie's details page and tap "Watch Party" to host for that title.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionCard, !params.movieId && styles.actionCardDisabled]}
            onPress={handleCreateParty}
            disabled={creating || !params.movieId}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#1a0000', '#0d0d0d']} style={styles.actionCardGradient}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(229,9,20,0.15)', borderColor: colors.red }]}>
                {creating ? (
                  <ActivityIndicator color={colors.red} size="small" />
                ) : (
                  <Ionicons name="add-circle" size={28} color={colors.red} />
                )}
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Create a Party</Text>
                <Text style={styles.actionDesc}>Host a watch party and invite friends</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#444" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setScreen('join')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#001a1a', '#0d0d0d']} style={styles.actionCardGradient}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(212,175,55,0.1)', borderColor: colors.gold }]}>
                <Ionicons name="enter" size={28} color={colors.gold} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Join a Party</Text>
                <Text style={styles.actionDesc}>Enter a code to join your friend's party</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#444" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Features list */}
          <View style={styles.featureList}>
            {[
              { icon: 'sync', label: 'Synchronized start for all members' },
              { icon: 'chatbubbles', label: 'Live chat during the movie' },
              { icon: 'shield-checkmark', label: 'Private parties — invite only' },
              { icon: 'people', label: 'Up to 10 viewers per party' },
            ].map((f) => (
              <View key={f.icon} style={styles.featureRow}>
                <Ionicons name={f.icon as any} size={16} color={colors.gold} />
                <Text style={styles.featureText}>{f.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Join screen ────────────────────────────────────────────────────────────
  if (screen === 'join') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient colors={['#000', '#0a0a0a', '#000']} style={StyleSheet.absoluteFill} />
        <ScrollView contentContainerStyle={styles.joinScroll}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('home')}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.joinHeader}>
            <Ionicons name="enter" size={40} color={colors.gold} />
            <Text style={styles.joinTitle}>Join a Party</Text>
            <Text style={styles.joinSub}>Ask your friend for the 6-character code</Text>
          </View>

          <View style={styles.joinInputWrap}>
            <TextInput
              style={styles.joinInput}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ENTER CODE"
              placeholderTextColor="#444"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />
          </View>

          <TouchableOpacity
            style={[styles.joinBtn, (joining || joinCode.length < 6) && styles.joinBtnDisabled]}
            onPress={handleJoinParty}
            disabled={joining || joinCode.length < 6}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#e50914', '#b5000c']} style={styles.joinBtnGradient}>
              {joining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="enter" size={20} color="#fff" />
                  <Text style={styles.joinBtnText}>Join Party</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Lobby screen ──────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#000', '#0a0a0a', '#000']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.lobbyHeader}>
        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveParty}>
          <Ionicons name="exit-outline" size={22} color={colors.red} />
        </TouchableOpacity>
        <View style={styles.lobbyHeaderCenter}>
          <Text style={styles.lobbyTitle} numberOfLines={1}>{party?.movieTitle ?? 'Watch Party'}</Text>
          <Text style={styles.lobbyStatus}>
            {party?.status === 'waiting' ? `${members.length} member${members.length !== 1 ? 's' : ''} joined` : 'Party started'}
          </Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShareCode}>
          <Ionicons name="share-outline" size={22} color={colors.gold} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.lobbyScroll}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Party code */}
        {party?.status === 'waiting' && (
          <Animated.View style={[styles.codeCard, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient colors={['#1a1200', '#0d0d0d']} style={styles.codeGradient}>
              <Text style={styles.codeLabel}>PARTY CODE</Text>
              <Text style={styles.codeValue}>{party?.code}</Text>
              <TouchableOpacity style={styles.copyCodeBtn} onPress={handleShareCode}>
                <Ionicons name="share-social-outline" size={14} color={colors.gold} />
                <Text style={styles.copyCodeText}>Share Code</Text>
              </TouchableOpacity>
            </LinearGradient>
            <View style={styles.codeGoldLine} />
          </Animated.View>
        )}

        {/* Members */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionLabel}>
            Members ({members.length})
            {membersTotal > 0 && (
              <Text style={styles.readyCount}> · {membersReady}/{membersTotal} ready</Text>
            )}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
            {members.map((m) => <MemberAvatar key={m.uid} member={m} />)}
          </ScrollView>
        </View>

        {/* Chat */}
        <View style={styles.chatSection}>
          <Text style={styles.sectionLabel}>Party Chat</Text>
          {messages.length === 0 ? (
            <View style={styles.chatEmpty}>
              <Ionicons name="chatbubbles-outline" size={28} color="#333" />
              <Text style={styles.chatEmptyText}>No messages yet. Say hi! 👋</Text>
            </View>
          ) : (
            messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.chatMsg,
                  msg.uid === user?.uid && styles.chatMsgOwn,
                ]}
              >
                {msg.uid !== user?.uid && (
                  <View style={styles.chatAvatar}>
                    {msg.photoURL ? (
                      <Image source={{ uri: msg.photoURL }} style={styles.chatAvatarImg} />
                    ) : (
                      <View style={[styles.chatAvatarImg, styles.chatAvatarFallback]}>
                        <Text style={styles.chatAvatarInitials}>{initials(msg.displayName)}</Text>
                      </View>
                    )}
                  </View>
                )}
                <View style={[styles.chatBubble, msg.uid === user?.uid && styles.chatBubbleOwn]}>
                  {msg.uid !== user?.uid && (
                    <Text style={styles.chatSender}>{msg.displayName.split(' ')[0]}</Text>
                  )}
                  <Text style={styles.chatText}>{msg.text}</Text>
                  <Text style={styles.chatTime}>{formatTime(msg.createdAt)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.lobbyBottom}>
        {/* Chat input */}
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            value={chatText}
            onChangeText={setChatText}
            placeholder="Say something..."
            placeholderTextColor="#444"
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!chatText.trim() || sendingMsg) && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!chatText.trim() || sendingMsg}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Action button */}
        {isHost ? (
          <TouchableOpacity style={styles.startBtn} onPress={handleStartParty} activeOpacity={0.88}>
            <LinearGradient colors={['#e50914', '#b5000c']} style={styles.startBtnGradient}>
              <Ionicons name="play" size={22} color="#fff" />
              <Text style={styles.startBtnText}>Start Party</Text>
              {membersTotal > 0 && (
                <View style={styles.readyBadge}>
                  <Text style={styles.readyBadgeText}>{membersReady}/{membersTotal}</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.readyBtn, isReady && styles.readyBtnActive]}
            onPress={handleToggleReady}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isReady ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={22}
              color={isReady ? '#2db52d' : '#666'}
            />
            <Text style={[styles.readyBtnText, isReady && styles.readyBtnTextActive]}>
              {isReady ? "I'm Ready!" : 'Tap when ready'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Home
  homeScroll: { paddingBottom: 60 },
  homeHeader: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
  },
  homeHeaderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 200,
    opacity: 0.5,
  },
  homeIconWrap: { marginBottom: 16 },
  homeIcon: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(212,175,55,0.4)',
  },
  homeTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 },
  homeSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },

  noMovieHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  noMovieText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  movieSelectedCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  movieSelectedGradient: { flexDirection: 'row', padding: 12, gap: 12, alignItems: 'center' },
  movieSelectedPoster: { width: 60, height: 90, borderRadius: 8 },
  posterPlaceholder: { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  movieSelectedInfo: { flex: 1 },
  movieSelectedLabel: { fontSize: 10, color: colors.gold, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  movieSelectedTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 8 },
  movieSelectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229,9,20,0.15)',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4, borderWidth: 1, borderColor: colors.red,
  },
  movieSelectedType: { fontSize: 10, color: colors.red, fontWeight: '700' },
  movieSelectedLine: { height: 2, backgroundColor: colors.gold, opacity: 0.4, marginHorizontal: 16, marginBottom: 2 },

  actionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  actionCardDisabled: { opacity: 0.5 },
  actionCardGradient: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
  },
  actionIcon: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 3 },
  actionDesc: { fontSize: 12, color: '#666' },

  featureList: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(212,175,55,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
    gap: 10,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 13, color: '#888' },

  // Join
  joinScroll: { paddingBottom: 60, paddingTop: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 4, marginBottom: 32 },
  backBtnText: { color: '#fff', fontSize: 16 },
  joinHeader: { alignItems: 'center', gap: 10, marginBottom: 40 },
  joinTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  joinSub: { fontSize: 13, color: '#666', textAlign: 'center' },
  joinInputWrap: { marginHorizontal: 40, marginBottom: 24 },
  joinInput: {
    height: 60,
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.gold,
    color: colors.gold,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 8,
  },
  joinBtn: { marginHorizontal: 40, borderRadius: 14, overflow: 'hidden' },
  joinBtnDisabled: { opacity: 0.5 },
  joinBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 54, gap: 10,
  },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Lobby
  lobbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 48,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.12)',
  },
  leaveBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  lobbyHeaderCenter: { flex: 1, marginHorizontal: 8 },
  lobbyTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  lobbyStatus: { color: '#666', fontSize: 11, marginTop: 1 },
  shareBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  lobbyScroll: { flex: 1 },

  codeCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  codeGradient: { alignItems: 'center', paddingVertical: 20 },
  codeLabel: { fontSize: 10, color: colors.gold, fontWeight: '700', letterSpacing: 3, marginBottom: 8 },
  codeValue: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: 10, marginBottom: 12 },
  copyCodeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(212,175,55,0.1)',
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
  },
  copyCodeText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  codeGoldLine: { height: 2, backgroundColor: colors.gold, opacity: 0.5, marginHorizontal: 20 },

  membersSection: { marginHorizontal: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 12, letterSpacing: 0.5 },
  readyCount: { color: '#2db52d' },
  membersRow: { gap: 8, paddingRight: 8 },

  chatSection: { marginHorizontal: 16, marginBottom: 8 },
  chatEmpty: { alignItems: 'center', padding: 24, gap: 8 },
  chatEmptyText: { color: '#444', fontSize: 13 },
  chatMsg: { flexDirection: 'row', marginBottom: 10, gap: 8 },
  chatMsgOwn: { flexDirection: 'row-reverse' },
  chatAvatar: {},
  chatAvatarImg: { width: 30, height: 30, borderRadius: 15 },
  chatAvatarFallback: { backgroundColor: '#1a1200', justifyContent: 'center', alignItems: 'center' },
  chatAvatarInitials: { color: colors.gold, fontWeight: '700', fontSize: 11 },
  chatBubble: {
    maxWidth: '72%',
    backgroundColor: '#141414',
    borderRadius: 12,
    borderTopLeftRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  chatBubbleOwn: {
    backgroundColor: 'rgba(229,9,20,0.12)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 4,
    borderColor: 'rgba(229,9,20,0.2)',
  },
  chatSender: { fontSize: 10, color: colors.gold, fontWeight: '700', marginBottom: 3 },
  chatText: { fontSize: 13, color: '#ddd', lineHeight: 18 },
  chatTime: { fontSize: 9, color: '#444', marginTop: 4, textAlign: 'right' },

  lobbyBottom: {
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    padding: 12,
    gap: 10,
  },
  chatInputRow: { flexDirection: 'row', gap: 8 },
  chatInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    color: '#fff',
    paddingHorizontal: 14,
    fontSize: 14,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: colors.red,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#2a2a2a' },

  startBtn: { borderRadius: 14, overflow: 'hidden' },
  startBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, gap: 10,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  readyBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  readyBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  readyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 14, gap: 10,
    backgroundColor: '#111', borderWidth: 1.5, borderColor: '#2a2a2a',
  },
  readyBtnActive: { borderColor: '#2db52d', backgroundColor: 'rgba(45,181,45,0.08)' },
  readyBtnText: { color: '#555', fontSize: 15, fontWeight: '700' },
  readyBtnTextActive: { color: '#2db52d' },
});

export default WatchPartyScreen;
