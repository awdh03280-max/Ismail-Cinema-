import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ND } from '../utils/animation';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Animated,
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ScreenOrientation from 'expo-screen-orientation';
import StreamEmbed from '../components/player/StreamEmbed';
import {
  SERVERS,
  StreamingServer,
  Quality,
  SubtitleLanguage,
  getDefaultServer,
} from '../api/streaming';
import {
  addToContinueWatching,
  updateWatchProgress,
  getPlaybackPosition,
  savePlaybackPosition,
  markEpisodeWatched,
} from '../storage/storage';
import ServerSelector from '../components/player/ServerSelector';
import QualitySelector from '../components/player/QualitySelector';
import SubtitleSelector from '../components/player/SubtitleSelector';
import { useAuth } from '../context/AuthContext';
import { useWatchPartyPlayback } from '../hooks/useWatchPartyPlayback';
import { useWatchPartyChat } from '../hooks/useWatchPartyChat';
import PartySyncBar from '../components/watchparty/PartySyncBar';
import WatchPartyChatFab from '../components/watchparty/WatchPartyChatFab';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// How often (ms) to auto-save progress
const SAVE_INTERVAL_MS = 30_000;
// Auto-hide controls after this many ms of inactivity
const HIDE_CONTROLS_DELAY = 3000;
// Double-tap detection window (ms)
const DOUBLE_TAP_DELAY = 300;
// Single-tap delay to distinguish from double-tap (ms)
const SINGLE_TAP_DELAY = 200;

interface PlayerParams {
  movieId: string;
  title: string;
  poster: string;
  contentType?: 'movie' | 'tv';
  runtimeMinutes?: number;
  initialProgress?: number;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  partyId?: string;
  partyIsHost?: boolean;
}

type TapSide = 'left' | 'right' | 'center';

const PlayerScreen = ({ route, navigation }: any) => {
  const {
    movieId,
    title,
    poster,
    contentType = 'movie',
    runtimeMinutes = 0,
    initialProgress = 0,
    season,
    episode,
    episodeTitle,
    partyId,
    partyIsHost = false,
  }: PlayerParams = route.params;

  const { t } = useTranslation();
  const { user } = useAuth();

  // ── Watch Party ──────────────────────────────────────────────────────────
  const { playback: partyPlayback, setPartyPlayback } = useWatchPartyPlayback(partyId ?? null);
  const {
    messages: partyMessages,
    chatText: partyChatText,
    setChatText: setPartyChatText,
    sendMessage: sendPartyMessage,
    sendingMsg: sendingPartyMsg,
    unreadCount: partyUnreadCount,
    markSeen: markPartyChatSeen,
    currentUid: partyCurrentUid,
  } = useWatchPartyChat(partyId ?? null);

  // Player state
  const [server, setServer] = useState<StreamingServer>(getDefaultServer());
  const [quality, setQuality] = useState<Quality>('auto');
  const [subtitle, setSubtitle] = useState<string>('off');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [failedServers, setFailedServers] = useState<Set<string>>(new Set());
  const [autoFallbackMsg, setAutoFallbackMsg] = useState<string>('');

  // Debounce flag — prevents onError + onHttpError from both triggering fallback
  const errorHandledRef = useRef(false);

  // Modal visibility
  const [showServerSelector, setShowServerSelector] = useState(false);
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [showSubtitleSelector, setShowSubtitleSelector] = useState(false);

  // Controls overlay visibility
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Progress tracking
  const sessionStartTime = useRef<number>(Date.now());
  const savedProgress = useRef<number>(initialProgress);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Double-tap gesture tracking
  const lastTapRef = useRef<{ side: TapSide; time: number } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seek feedback state
  const [seekFeedback, setSeekFeedback] = useState<TapSide | null>(null);
  const seekFeedbackOpacity = useRef(new Animated.Value(0)).current;
  const seekFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Blank-page / no-video safety timeout — fires handleServerError if the
  // WebView loads but no <video> element is detected within BLANK_TIMEOUT_MS.
  const blankTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const BLANK_TIMEOUT_MS = 20_000;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    // Lock to landscape on native
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    }

    StatusBar.setHidden(true, 'fade');

    addToContinueWatching({
      imdbID: movieId,
      title,
      poster,
      contentType,
      progress: initialProgress,
      watchedAt: Date.now(),
    });

    loadSavedPosition();
    scheduleHideControls();
    startBlankTimeout();
    saveIntervalRef.current = setInterval(saveProgress, SAVE_INTERVAL_MS);

    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleExit();
      return true;
    });

    return () => {
      // Restore portrait on native
      if (Platform.OS !== 'web') {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
      StatusBar.setHidden(false, 'fade');
      clearTimers();
      backSub.remove();
      saveProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSavedPosition = async () => {
    const pos = await getPlaybackPosition(movieId);
    if (pos !== null) {
      savedProgress.current = pos;
    }
  };

  const clearTimers = () => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    if (seekFeedbackTimer.current) clearTimeout(seekFeedbackTimer.current);
    if (blankTimeoutRef.current) clearTimeout(blankTimeoutRef.current);
  };

  // Start (or restart) the blank-page safety timer.
  // Cancelled when VIDEO_OK arrives; fires handleServerError otherwise.
  const startBlankTimeout = () => {
    if (blankTimeoutRef.current) clearTimeout(blankTimeoutRef.current);
    blankTimeoutRef.current = setTimeout(() => {
      blankTimeoutRef.current = null;
      handleServerError();
    }, BLANK_TIMEOUT_MS);
  };

  // ── Progress ──────────────────────────────────────────────────────────────

  const computeProgress = (): number => {
    if (runtimeMinutes > 0) {
      const elapsedMinutes = (Date.now() - sessionStartTime.current) / 60_000;
      const computed = savedProgress.current + (elapsedMinutes / runtimeMinutes) * 100;
      return Math.min(Math.round(computed), 99);
    }
    const elapsedMinutes = (Date.now() - sessionStartTime.current) / 60_000;
    return Math.min(Math.round(savedProgress.current + elapsedMinutes), 99);
  };

  const saveProgress = useCallback(async () => {
    const progress = computeProgress();
    await updateWatchProgress(movieId, progress, { title, poster });
    await savePlaybackPosition(movieId, progress);
  }, [movieId, title, poster]);

  // ── Controls overlay ──────────────────────────────────────────────────────

  const scheduleHideControls = () => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: ND,
      }).start(() => setControlsVisible(false));
    }, HIDE_CONTROLS_DELAY);
  };

  const showControls = useCallback(() => {
    setControlsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: ND,
    }).start();
    scheduleHideControls();
  }, []);

  const toggleControls = useCallback(() => {
    if (controlsVisible) {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: ND,
      }).start(() => setControlsVisible(false));
    } else {
      showControls();
    }
  }, [controlsVisible, showControls]);

  // ── Seek feedback (visual only — WebView embed can't be seeked externally) ─

  const showSeekFeedback = useCallback((side: 'left' | 'right') => {
    if (seekFeedbackTimer.current) clearTimeout(seekFeedbackTimer.current);
    setSeekFeedback(side);
    seekFeedbackOpacity.setValue(1);
    seekFeedbackTimer.current = setTimeout(() => {
      Animated.timing(seekFeedbackOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: ND,
      }).start(() => setSeekFeedback(null));
    }, 700);
  }, [seekFeedbackOpacity]);

  // ── Gesture handling (tap zones) ──────────────────────────────────────────

  const handlePress = useCallback((event: any) => {
    const x = event?.nativeEvent?.locationX ?? SCREEN_WIDTH / 2;
    let side: TapSide;
    if (x < SCREEN_WIDTH * 0.3) side = 'left';
    else if (x > SCREEN_WIDTH * 0.7) side = 'right';
    else side = 'center';

    const now = Date.now();
    const last = lastTapRef.current;

    if (
      last &&
      last.side === side &&
      side !== 'center' &&
      now - last.time < DOUBLE_TAP_DELAY
    ) {
      // Double-tap on left or right — show seek feedback
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = null;
      showSeekFeedback(side);
      showControls();
    } else {
      // Potential first tap — store and wait to see if a second comes
      lastTapRef.current = { side, time: now };
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = setTimeout(() => {
        lastTapRef.current = null;
        singleTapTimerRef.current = null;
        toggleControls();
      }, SINGLE_TAP_DELAY);
    }
  }, [showSeekFeedback, showControls, toggleControls]);

  // ── Server management ─────────────────────────────────────────────────────

  const switchServer = (next: StreamingServer) => {
    savedProgress.current = computeProgress();
    sessionStartTime.current = Date.now();
    errorHandledRef.current = false;
    setServer(next);
    setIsLoading(true);
    setHasError(false);
    showControls();
    startBlankTimeout();
  };

  const handleServerError = () => {
    if (errorHandledRef.current) return;
    errorHandledRef.current = true;

    const newFailed = new Set(failedServers).add(server.id);
    setFailedServers(newFailed);

    const available = SERVERS.find((s) => !newFailed.has(s.id));
    if (available) {
      setAutoFallbackMsg(`"${server.name}" unavailable — switching to ${available.name}`);
      switchServer(available);
      setTimeout(() => setAutoFallbackMsg(''), 3500);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  // ── WebView message handler ───────────────────────────────────────────────
  // Receives signals from the injected JS content detector in StreamEmbed.
  const handleWebMessage = useCallback((msg: { type: string }) => {
    if (msg.type === 'VIDEO_OK') {
      // A <video> element appeared — video is playing, cancel the fallback timer.
      if (blankTimeoutRef.current) {
        clearTimeout(blankTimeoutRef.current);
        blankTimeoutRef.current = null;
      }
    } else if (msg.type === 'BLANK_PAGE') {
      // Injected JS detected no video/iframe after 8 s — auto-switch server.
      handleServerError();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExit = async () => {
    await saveProgress();
    navigation.goBack();
  };

  // ── Mark episode watched ──────────────────────────────────────────────────

  useEffect(() => {
    if (contentType === 'tv' && season != null && episode != null) {
      markEpisodeWatched(movieId, season, episode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const streamUrl = server.getUrl(movieId, quality, subtitle, contentType, season, episode);
  const displayTitle =
    contentType === 'tv' && season != null && episode != null && episodeTitle
      ? `S${season}:E${episode} · ${episodeTitle}`
      : title;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* ── Stream embed ─────────────────────────────────────────────────── */}
      <StreamEmbed
        uri={streamUrl}
        style={styles.webView}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={handleServerError}
        onWebMessage={handleWebMessage}
      />

      {/* ── Full-screen gesture overlay ───────────────────────────────────── */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handlePress}>
        {/* Transparent — touches also pass to WebView for its own controls */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none" />
      </Pressable>

      {/* ── Seek feedback (double-tap) ────────────────────────────────────── */}
      {seekFeedback != null && (
        <Animated.View
          style={[
            styles.seekFeedback,
            seekFeedback === 'left' ? styles.seekFeedbackLeft : styles.seekFeedbackRight,
            { opacity: seekFeedbackOpacity },
          ]}
          pointerEvents="none"
        >
          <Ionicons
            name={seekFeedback === 'left' ? 'play-back' : 'play-forward'}
            size={28}
            color="#fff"
          />
          <Text style={styles.seekFeedbackText}>{t('seek_seconds')}</Text>
        </Animated.View>
      )}

      {/* ── Loading overlay ───────────────────────────────────────────────── */}
      {isLoading && (
        <View style={styles.loaderContainer} pointerEvents="none">
          <ActivityIndicator size="large" color="#e50914" />
          <Text style={styles.loaderText}>{t('player_loading')}</Text>
        </View>
      )}

      {/* ── All-servers failed error ──────────────────────────────────────── */}
      {hasError && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#e50914" />
          <Text style={styles.errorTitle}>{t('player_error_title')}</Text>
          <Text style={styles.errorMessage}>{t('player_error_message')}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              setFailedServers(new Set());
              switchServer(SERVERS[0]);
            }}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>{t('player_retry')}</Text>
          </Pressable>
          <Pressable style={styles.exitFromErrorBtn} onPress={handleExit}>
            <Text style={styles.exitFromErrorText}>{t('player_go_back')}</Text>
          </Pressable>
        </View>
      )}

      {/* ── Auto-fallback toast ───────────────────────────────────────────── */}
      {!!autoFallbackMsg && (
        <View style={styles.toast} pointerEvents="none">
          <Ionicons name="swap-horizontal" size={14} color="#fff" />
          <Text style={styles.toastText}>{autoFallbackMsg}</Text>
        </View>
      )}

      {/* ── Controls overlay ─────────────────────────────────────────────── */}
      {controlsVisible && (
        <Animated.View
          style={[styles.controls, { opacity: controlsOpacity }]}
          pointerEvents="box-none"
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable onPress={handleExit} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </Pressable>

            <View style={styles.titleContainer} pointerEvents="none">
              <Text style={styles.movieTitle} numberOfLines={1}>{displayTitle}</Text>
              <View style={styles.serverTag}>
                <Ionicons name="wifi" size={11} color="#e50914" />
                <Text style={styles.serverTagText}>{server.name}</Text>
              </View>
            </View>

            <View style={styles.topActions}>
              <Pressable
                style={styles.topBtn}
                onPress={() => { showControls(); setShowSubtitleSelector(true); }}
              >
                <Ionicons name="text" size={20} color="#fff" />
              </Pressable>

              <Pressable
                style={styles.topBtn}
                onPress={() => { showControls(); setShowQualitySelector(true); }}
              >
                <Ionicons name="settings-sharp" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Bottom bar */}
          <View style={styles.bottomBar}>
            <Pressable
              style={styles.serverBtn}
              onPress={() => { showControls(); setShowServerSelector(true); }}
            >
              <Ionicons name="layers" size={16} color="#fff" />
              <Text style={styles.serverBtnText}>
                {t('player_server_prefix', { name: server.name })}
              </Text>
              <Ionicons name="chevron-up" size={14} color="#aaa" />
            </Pressable>

            <View style={styles.bottomRight}>
              <Pressable
                style={styles.qualityChip}
                onPress={() => { showControls(); setShowQualitySelector(true); }}
              >
                <Text style={styles.qualityChipText}>{quality.toUpperCase()}</Text>
              </Pressable>

              {subtitle !== 'off' && (
                <View style={styles.subtitleChip}>
                  <Text style={styles.subtitleChipText}>CC</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Watch Party sync bar + chat ───────────────────────────────────── */}
      {!!partyId && (
        <>
          <PartySyncBar
            isHost={partyIsHost}
            playback={partyPlayback}
            onSetPlayback={(patch) => {
              if (user) setPartyPlayback(patch, user.uid);
            }}
          />
          <WatchPartyChatFab
            messages={partyMessages}
            chatText={partyChatText}
            setChatText={setPartyChatText}
            onSend={sendPartyMessage}
            sendingMsg={sendingPartyMsg}
            unreadCount={partyUnreadCount}
            currentUid={partyCurrentUid}
            onOpen={markPartyChatSeen}
            bottomOffset={40}
          />
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <ServerSelector
        visible={showServerSelector}
        currentServerId={server.id}
        onSelect={switchServer}
        onClose={() => setShowServerSelector(false)}
      />
      <QualitySelector
        visible={showQualitySelector}
        currentQuality={quality}
        onSelect={setQuality}
        onClose={() => setShowQualitySelector(false)}
      />
      <SubtitleSelector
        visible={showSubtitleSelector}
        currentCode={subtitle}
        onSelect={(lang: SubtitleLanguage) => setSubtitle(lang.code)}
        onClose={() => setShowSubtitleSelector(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loaderText: {
    color: '#aaa',
    marginTop: 14,
    fontSize: 14,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 32,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  exitFromErrorBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  exitFromErrorText: {
    color: '#aaa',
    fontSize: 14,
  },
  toast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 12 : 48,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  serverTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  serverTagText: {
    color: '#e50914',
    fontSize: 11,
    fontWeight: '600',
  },
  topActions: {
    flexDirection: 'row',
    gap: 4,
  },
  topBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'android' ? 16 : 32,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  serverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229,9,20,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.35)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  serverBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qualityChip: {
    backgroundColor: '#222',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#444',
  },
  qualityChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  subtitleChip: {
    backgroundColor: 'rgba(229,9,20,0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#e50914',
  },
  subtitleChipText: {
    color: '#e50914',
    fontSize: 11,
    fontWeight: '700',
  },
  // Seek feedback overlays
  seekFeedback: {
    position: 'absolute',
    top: '50%',
    marginTop: -40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 50,
    width: 80,
    height: 80,
    gap: 4,
  },
  seekFeedbackLeft: {
    left: 40,
  },
  seekFeedbackRight: {
    right: 40,
  },
  seekFeedbackText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default PlayerScreen;
