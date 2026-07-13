/**
 * useWatchPartyPlayback — best-effort synchronized playback state for a Watch Party.
 *
 * The app streams from free third-party embeds (VidSrc, AutoEmbed, etc.) rendered in a
 * sandboxed cross-origin iframe/WebView. There is no API to reach into that player, so we
 * cannot force-pause or force-seek a guest's video directly. Instead the host's Play/Pause/
 * Seek actions are broadcast as an authoritative "party clock" on the party document, and
 * every member's PlayerScreen shows a live sync bar reflecting it — the closest possible
 * approximation of synchronized playback with these embeds.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface PartyPlayback {
  isPlaying: boolean;
  positionSeconds: number;
  updatedAt: number;
  updatedBy: string;
}

export function useWatchPartyPlayback(partyId: string | null) {
  const [playback, setPlayback] = useState<PartyPlayback | null>(null);
  const playbackRef = useRef<PartyPlayback | null>(null);

  useEffect(() => {
    if (!partyId) {
      setPlayback(null);
      playbackRef.current = null;
      return;
    }
    const unsub = onSnapshot(doc(db, 'watchParties', partyId), (snap) => {
      const data = snap.data();
      const pb: PartyPlayback | null = data?.playback ?? null;
      playbackRef.current = pb;
      setPlayback(pb);
    });
    return unsub;
  }, [partyId]);

  /** Host-only: push a new authoritative playback state. */
  const setPartyPlayback = useCallback(
    async (patch: Partial<Pick<PartyPlayback, 'isPlaying' | 'positionSeconds'>>, uid: string) => {
      if (!partyId) return;
      const base = playbackRef.current ?? { isPlaying: false, positionSeconds: 0, updatedAt: 0, updatedBy: uid };
      const next: PartyPlayback = {
        isPlaying: patch.isPlaying ?? base.isPlaying,
        positionSeconds: patch.positionSeconds ?? base.positionSeconds,
        updatedAt: Date.now(),
        updatedBy: uid,
      };
      playbackRef.current = next;
      await updateDoc(doc(db, 'watchParties', partyId), { playback: next });
    },
    [partyId]
  );

  return { playback, setPartyPlayback };
}
