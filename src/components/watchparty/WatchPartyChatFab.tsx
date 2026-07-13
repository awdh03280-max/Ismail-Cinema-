/**
 * WatchPartyChatFab — floating chat button for a Watch Party.
 * Tapping opens a slide-up chat panel; tapping again closes it.
 * Used in both the Lobby and the Player screen so chat stays reachable
 * during synchronized playback without covering the video permanently.
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { ChatMessage } from '../../hooks/useWatchPartyChat';

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const formatTime = (ts: any): string => {
  if (!ts?.toMillis) return '';
  const ms = Date.now() - ts.toMillis();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h`;
};

interface Props {
  messages: ChatMessage[];
  chatText: string;
  setChatText: (t: string) => void;
  onSend: () => void;
  sendingMsg: boolean;
  unreadCount: number;
  currentUid?: string;
  onOpen?: () => void;
  /** Raise the FAB above other bottom UI (e.g. host controls bar) */
  bottomOffset?: number;
}

const WatchPartyChatFab: React.FC<Props> = ({
  messages,
  chatText,
  setChatText,
  onSend,
  sendingMsg,
  unreadCount,
  currentUid,
  onOpen,
  bottomOffset = 24,
}) => {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      onOpen?.();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  return (
    <>
      {open && (
        <View style={[styles.panel, { bottom: bottomOffset + 72 }]}>
          <View style={styles.panelHeader}>
            <Ionicons name="chatbubbles" size={16} color={colors.gold} />
            <Text style={styles.panelTitle}>Party Chat</Text>
            <TouchableOpacity onPress={toggle} style={styles.panelClose}>
              <Ionicons name="close" size={18} color="#aaa" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.msgList}
            contentContainerStyle={styles.msgListContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={26} color="#333" />
                <Text style={styles.emptyText}>No messages yet. Say hi! 👋</Text>
              </View>
            ) : (
              messages.map((msg) => (
                <View key={msg.id} style={[styles.msgRow, msg.uid === currentUid && styles.msgRowOwn]}>
                  {msg.uid !== currentUid && (
                    <View style={styles.avatar}>
                      {msg.photoURL ? (
                        <Image source={{ uri: msg.photoURL }} style={styles.avatarImg} />
                      ) : (
                        <View style={[styles.avatarImg, styles.avatarFallback]}>
                          <Text style={styles.avatarInitials}>{initials(msg.displayName)}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={[styles.bubble, msg.uid === currentUid && styles.bubbleOwn]}>
                    {msg.uid !== currentUid && (
                      <Text style={styles.sender}>{msg.displayName.split(' ')[0]}</Text>
                    )}
                    <Text style={styles.text}>{msg.text}</Text>
                    <Text style={styles.time}>{formatTime(msg.createdAt)}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={chatText}
              onChangeText={setChatText}
              placeholder="Say something..."
              placeholderTextColor="#555"
              returnKeyType="send"
              onSubmitEditing={onSend}
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!chatText.trim() || sendingMsg) && styles.sendBtnDisabled]}
              onPress={onSend}
              disabled={!chatText.trim() || sendingMsg}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: bottomOffset }]}
        onPress={toggle}
        activeOpacity={0.85}
      >
        <Ionicons name={open ? 'close' : 'chatbubbles'} size={24} color="#fff" />
        {!open && unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    elevation: 6,
    ...Platform.select({
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  badgeText: { color: '#000', fontSize: 10, fontWeight: '800' },

  panel: {
    position: 'absolute',
    right: 12,
    left: 12,
    maxHeight: 380,
    backgroundColor: 'rgba(10,10,10,0.97)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    overflow: 'hidden',
    zIndex: 49,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  panelTitle: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 13 },
  panelClose: { padding: 4 },

  msgList: { maxHeight: 220 },
  msgListContent: { padding: 12, gap: 10 },
  empty: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { color: '#444', fontSize: 12 },

  msgRow: { flexDirection: 'row', gap: 8 },
  msgRowOwn: { flexDirection: 'row-reverse' },
  avatar: {},
  avatarImg: { width: 26, height: 26, borderRadius: 13 },
  avatarFallback: { backgroundColor: '#1a1200', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { color: colors.gold, fontWeight: '700', fontSize: 10 },
  bubble: {
    maxWidth: '72%',
    backgroundColor: '#141414',
    borderRadius: 12,
    borderTopLeftRadius: 4,
    padding: 9,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  bubbleOwn: {
    backgroundColor: 'rgba(229,9,20,0.15)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 4,
    borderColor: 'rgba(229,9,20,0.25)',
  },
  sender: { fontSize: 9, color: colors.gold, fontWeight: '700', marginBottom: 2 },
  text: { fontSize: 12, color: '#ddd', lineHeight: 16 },
  time: { fontSize: 8, color: '#444', marginTop: 3, textAlign: 'right' },

  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
  },
  input: {
    flex: 1,
    height: 38,
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    color: '#fff',
    paddingHorizontal: 12,
    fontSize: 13,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.red,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#2a2a2a' },
});

export default WatchPartyChatFab;
