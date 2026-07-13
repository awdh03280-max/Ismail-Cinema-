/**
 * PartySyncBar — synchronized playback controls shown inside PlayerScreen
 * while a Watch Party is active.
 *
 * The host gets Play / Pause / Seek controls that broadcast an authoritative
 * "party clock" (see useWatchPartyPlayback). Guests see that clock live so
 * everyone stays on the same page even though each person's stream renders
 * in their own independent third-party player embed.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { PartyPlayback } from '../../hooks/useWatchPartyPlayback';

const formatClock = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

interface Props {
  isHost: boolean;
  playback: PartyPlayback | null;
  onSetPlayback: (patch: Partial<Pick<PartyPlayback, 'isPlaying' | 'positionSeconds'>>) => void;
}

const PartySyncBar: React.FC<Props> = ({ isHost, playback, onSetPlayback }) => {
  // Locally-ticking display clock so guests see live-updating time between snapshots.
  const [liveSeconds, setLiveSeconds] = useState(playback?.positionSeconds ?? 0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLiveSeconds(playback?.positionSeconds ?? 0);
    if (tickRef.current) clearInterval(tickRef.current);
    if (playback?.isPlaying) {
      tickRef.current = setInterval(() => setLiveSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [playback?.isPlaying, playback?.positionSeconds, playback?.updatedAt]);

  const isPlaying = playback?.isPlaying ?? false;

  const handlePlayPause = () => onSetPlayback({ isPlaying: !isPlaying, positionSeconds: liveSeconds });
  const handleSeek = (deltaSeconds: number) =>
    onSetPlayback({ positionSeconds: Math.max(0, liveSeconds + deltaSeconds) });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.pill}>
        <Ionicons name="people" size={13} color={colors.gold} />
        <Text style={styles.clock}>{formatClock(liveSeconds)}</Text>
        <View style={[styles.dot, isPlaying && styles.dotPlaying]} />
        <Text style={styles.status}>
          {isHost ? 'You are hosting' : isPlaying ? 'Host: Playing' : 'Host: Paused'}
        </Text>
      </View>

      {isHost && (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleSeek(-10)} activeOpacity={0.8}>
            <Ionicons name="play-back" size={16} color="#fff" />
            <Text style={styles.ctrlLabel}>10</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playBtn} onPress={handlePlayPause} activeOpacity={0.85}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleSeek(10)} activeOpacity={0.8}>
            <Ionicons name="play-forward" size={16} color="#fff" />
            <Text style={styles.ctrlLabel}>10</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 12 : 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 40,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  clock: { color: '#fff', fontSize: 12, fontWeight: '800' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#666' },
  dotPlaying: { backgroundColor: '#2db52d' },
  status: { color: '#ccc', fontSize: 11, fontWeight: '600' },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.35)',
  },
  ctrlBtn: { alignItems: 'center', justifyContent: 'center' },
  ctrlLabel: { color: '#aaa', fontSize: 8, fontWeight: '700', marginTop: 1 },
  playBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.red,
    justifyContent: 'center', alignItems: 'center',
  },
});

export default PartySyncBar;
