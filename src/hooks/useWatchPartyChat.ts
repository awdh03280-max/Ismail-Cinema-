/**
 * useWatchPartyChat — shared real-time chat logic for a Watch Party.
 * Used by both the WatchPartyScreen lobby and the floating chat overlay
 * shown inside PlayerScreen while synchronized playback is in progress.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

export interface ChatMessage {
  id: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  text: string;
  createdAt: Timestamp | null;
}

export function useWatchPartyChat(partyId: string | null) {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenCountRef = useRef(0);

  useEffect(() => {
    if (!partyId) {
      setMessages([]);
      seenCountRef.current = 0;
      setUnreadCount(0);
      return;
    }
    const chatQ = query(collection(db, 'watchParties', partyId, 'chat'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(chatQ, (snap) => {
      const msgs: ChatMessage[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setMessages(msgs);
      const newCount = msgs.length - seenCountRef.current;
      if (newCount > 0) setUnreadCount((c) => c + newCount);
      seenCountRef.current = msgs.length;
    });
    return unsub;
  }, [partyId]);

  const markSeen = useCallback(() => {
    seenCountRef.current = messages.length;
    setUnreadCount(0);
  }, [messages.length]);

  const sendMessage = useCallback(async () => {
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
      console.error('[WatchPartyChat] send error:', err);
    } finally {
      setSendingMsg(false);
    }
  }, [user, userProfile, chatText, partyId]);

  return { messages, chatText, setChatText, sendMessage, sendingMsg, unreadCount, markSeen, currentUid: user?.uid };
}
