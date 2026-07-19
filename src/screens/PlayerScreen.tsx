/**
 * PlayerScreen — full-screen streaming player.
 *
 * Server fallback strategy (no injected JS detection):
 *   1. Each server gets LOAD_TIMEOUT_MS (10 s) to finish loading its page.
 *   2. onError / onHttpError (≥ 400) triggers an immediate switch.
 *   3. onLoadEnd cancels the timeout — the page loaded, assume it may work.
 *   4. If the timeout fires before onLoadEnd, handleServerError() switches.
 *   5. Once all servers are exhausted, an error screen with a Retry button
 *      resets the failed-server set and starts over from the first server.
 *
 * Stale-closure safety:
 *   - server and failedServers are mirrored in refs (serverRef, failedServersRef)
 *     so timer callbacks always read the current value, not a stale snapshot.
 *   - handleServerErrorRef is kept current by a no-dep-array useEffect so
 *     the 10 s timeout always calls the latest version of handleServerError.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
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
} from '../api/streaming';
import ServerSelector from '../components/player/ServerSelector';
import QualitySelector from '../components/player/QualitySelector';
import SubtitleSelector from '../components/player/SubtitleSelector';
import {
  addToContinueWatching,
  updateWatchProgress,
  getPlaybackPosition,
  savePlaybackPosition,
  markEpisodeWatched,
} from '../storage/storage';
import { useAuth } from '../context/AuthContext';
import { useWatchPartyPlayback } from '../hooks/useWatchPartyPlayback';
import { useWatchPartyChat } from '../hooks/useWatchPartyChat';
import PartySyncBar from '../components/watchparty/PartySyncBar';
import WatchPartyChatFab from '../components/watchparty/WatchPartyChatFab';
import { ND } from '../utils/animation';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** How long each server has to finish loading before we switch to the next. */
const LOAD_TIMEOUT_MS = 10_000;
/** How often to auto-save watch progress. */
const SAVE_INTERVAL_MS = 30_000;
/** Auto-hide controls after this many ms of inactivity. */
const HIDE_CONTROLS_DELAY = 3_000;
/** Window for detecting a double-tap (ms). */
const DOUBLE_TAP_DELAY = 300;
/** Delay before treating a tap as single (not double). */
const SINGLE_TAP_DELAY = 200;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

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

  // ── Watch Party ────────────────────────────────────────────────────────────
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

  // ── Server / fallback state ────────────────────────────────────────────────

  const [server, setServer]           = useState<StreamingServer>(SERVERS[0]);
  const [failedServers, setFailedServers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading]     = useState(true);
  const [hasError, setHasError]       = useState(false);
  const [autoFallbackMsg, setAutoFallbackMsg] = useState('');

  // Mirrors of server/failedServers for use inside timer callbacks and
  // useCallback hooks that would otherwise close over stale state.
  const serverRef       = useRef<StreamingServer>(SERVERS[0]);
  const failedServersRef = useRef<Set<string>>(new Set());

  // Prevents onError + onHttpError from both triggering a switch for the same
  // server load attempt.
  const errorHandledRef = useRef(false);

  // react-native-webview fires onLoadEnd after onError in the same native-event
  // batch, before React has re-rendered and swapped the WebView key.  We block
  // onLoadEnd in switchServer and re-enable it when the new WebView's
  // onLoadStart arrives — that guarantees any stale callback from the previous
  // server is ignored.
  const allowLoadEndRef = useRef(true);

  // 10-second load timeout handle.
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always points to the latest handleServerError so the timeout closure is
  // never stale (updated after every render by the no-dep-array useEffect).
  const handleServerErrorRef = useRef<() => void>(() => {});

  // ── Player UI state ────────────────────────────────────────────────────────

  const [quality, setQuality]   = useState<Quality>('auto');
  const [subtitle, setSubtitle] = useState<string>('off');

  const [showServerSelector, setShowServerSelector]   = useState(false);
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [showSubtitleSelector, setShowSubtitleSelector] = useState(false);

  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsOpacity  = useRef(new Animated.Value(1)).current;
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Progress tracking ──────────────────────────────────────────────────────

  const sessionStartTime = useRef<number>(Date.now());
  const savedProgress    = useRef<number>(initialProgress);
  const saveIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Double-tap gesture ────────────────────────────────────────────────────

  const lastTapRef        = useRef<{ side: TapSide; time: number } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [seekFeedback, setSeekFeedback] = useState<TapSide | null>(null);
  const seekFeedbackOpacity = useRef(new Animated.Value(0)).current;
  const seekFeedbackTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers — keep state + ref in sync ────────────────────────────────────

  const setServerAndRef = (s: StreamingServer) => {
    serverRef.current = s;
    setServer(s);
  };

  const setFailedAndRef = (s: Set<string>) => {
    failedServersRef.current = s;
    setFailedServers(s);
  };

  // ── Timer helpers ──────────────────────────────────────────────────────────

  const clearLoadTimeout = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  };

  const startLoadTimeout = () => {
    clearLoadTimeout();
    loadTimeoutRef.current = setTimeout(() => {
      // Always call the ref so we get the render-fresh handleServerError.
      handleServerErrorRef.current();
    }, LOAD_TIMEOUT_MS);
  };

  const clearAllTimers = () => {
    clearLoadTimeout();
    if (hideControlsTimer.current)  clearTimeout(hideControlsTimer.current);
    if (saveIntervalRef.current)    clearInterval(saveIntervalRef.current);
    if (singleTapTimerRef.current)  clearTimeout(singleTapTimerRef.current);
    if (seekFeedbackTimer.current)  clearTimeout(seekFeedbackTimer.current);
  };

  // ── Keep handleServerErrorRef current after every render ──────────────────
  // No dependency array → runs after every render → ref always has the latest.
  useEffect(() => {
    handleServerErrorRef.current = handleServerError; // eslint-disable-line react-hooks/exhaustive-deps
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
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
    startLoadTimeout(); // first server timeout
    saveIntervalRef.current = setInterval(saveProgress, SAVE_INTERVAL_MS);

    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleExit();
      return true;
    });

    return () => {
      if (Platform.OS !== 'web') {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
      StatusBar.setHidden(false, 'fade');
      clearAllTimers();
      backSub.remove();
      saveProgress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (contentType === 'tv' && season != null && episode != null) {
      markEpisodeWatched(movieId, season, episode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Progress ───────────────────────────────────────────────────────────────

  const loadSavedPosition = async () => {
    const pos = await getPlaybackPosition(movieId);
    if (pos !== null) savedProgress.current = pos;
  };

  const computeProgress = (): number => {
    const elapsedMin = (Date.now() - sessionStartTime.current) / 60_000;
    if (runtimeMinutes > 0) {
      return Math.min(Math.round(savedProgress.current + (elapsedMin / runtimeMinutes) * 100), 99);
    }
    return Math.min(Math.round(savedProgress.current + elapsedMin), 99);
  };

  const saveProgress = useCallback(async () => {
    const progress = computeProgress();
    await updateWatchProgress(movieId, progress, { title, poster });
    await savePlaybackPosition(movieId, progress);
  }, [movieId, title, poster]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls overlay ───────────────────────────────────────────────────────

  const scheduleHideControls = () => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      Animated.timing(controlsOpacity, {
        toValue: 0, duration: 400, useNativeDriver: ND,
      }).start(() => setControlsVisible(false));
    }, HIDE_CONTROLS_DELAY);
  };

  const showControls = useCallback(() => {
    setControlsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1, duration: 200, useNativeDriver: ND,
    }).start();
    scheduleHideControls();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleControls = useCallback(() => {
    if (controlsVisible) {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      Animated.timing(controlsOpacity, {
        toValue: 0, duration: 200, useNativeDriver: ND,
      }).start(() => setControlsVisible(false));
    } else {
      showControls();
    }
  }, [controlsVisible, showControls]);

  // ── Seek feedback ──────────────────────────────────────────────────────────

  const showSeekFeedback = useCallback((side: 'left' | 'right') => {
    if (seekFeedbackTimer.current) clearTimeout(seekFeedbackTimer.current);
    setSeekFeedback(side);
    seekFeedbackOpacity.setValue(1);
    seekFeedbackTimer.current = setTimeout(() => {
      Animated.timing(seekFeedbackOpacity, {
        toValue: 0, duration: 300, useNativeDriver: ND,
      }).start(() => setSeekFeedback(null));
    }, 700);
  }, [seekFeedbackOpacity]);

  // ── Tap gesture ────────────────────────────────────────────────────────────

  const handlePress = useCallback((event: any) => {
    const x = event?.nativeEvent?.locationX ?? SCREEN_WIDTH / 2;
    let side: TapSide;
    if (x < SCREEN_WIDTH * 0.3) side = 'left';
    else if (x > SCREEN_WIDTH * 0.7) side = 'right';
    else side = 'center';

    const now  = Date.now();
    const last = lastTapRef.current;

    if (last && last.side === side && side !== 'center' && now - last.time < DOUBLE_TAP_DELAY) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = null;
      showSeekFeedback(side);
      showControls();
    } else {
      lastTapRef.current = { side, time: now };
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = setTimeout(() => {
        lastTapRef.current = null;
        singleTapTimerRef.current = null;
        toggleControls();
      }, SINGLE_TAP_DELAY);
    }
  }, [showSeekFeedback, showControls, toggleControls]);

  // ── Server management ──────────────────────────────────────────────────────

  /**
   * Switch to a specific server.
   * Resets the error-handled guard and starts a fresh 10 s load timeout.
   */
  const switchServer = (next: StreamingServer) => {
    allowLoadEndRef.current  = false; // block any stale onLoadEnd from the previous server
    errorHandledRef.current  = false;
    savedProgress.current    = computeProgress();
    sessionStartTime.current = Date.now();
    setServerAndRef(next);
    setIsLoading(true);
    setHasError(false);
    startLoadTimeout();
    showControls();
  };

  /**
   * Called when the current server is considered failed (timeout, error, HTTP
   * error).  Reads exclusively from refs so it is safe to call from timer
   * callbacks that captured a stale closure.
   *
   * Finds the next server that has not been tried yet in this session.
   * If none remain, shows the all-failed error UI.
   */
  const handleServerError = () => {
    if (errorHandledRef.current) return;
    errorHandledRef.current = true;
    clearLoadTimeout();

    const currentId = serverRef.current.id;
    const newFailed = new Set(failedServersRef.current).add(currentId);
    setFailedAndRef(newFailed);

    const next = SERVERS.find((s) => !newFailed.has(s.id));
    if (next) {
      setAutoFallbackMsg(`"${serverRef.current.name}" failed — trying ${next.name}…`);
      setTimeout(() => setAutoFallbackMsg(''), 3_500);
      switchServer(next);
    } else {
      // Every server has failed.
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleExit = async () => {
    await saveProgress();
    navigation.goBack();
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const streamUrl = server.getUrl(movieId, quality, subtitle, contentType, season, episode);

  const displayTitle =
    contentType === 'tv' && season != null && episode != null && episodeTitle
      ? `S${season}:E${episode} · ${episodeTitle}`
      : title;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* ── Stream embed ──────────────────────────────────────────────────── */}
      <StreamEmbed
        uri={streamUrl}
        style={styles.embed}
        onLoadStart={() => {
          // Re-enable onLoadEnd: this callback comes from the NEW WebView, so
          // any stale onLoadEnd from the previous server is now in the past.
          allowLoadEndRef.current = true;
          setIsLoading(true);
          setHasError(false);
        }}
        onLoadEnd={() => {
          // Guarded by allowLoadEndRef: switchServer() sets it to false so that
          // the stale onLoadEnd react-native-webview emits after onError (in the
          // same native batch, before the re-render) cannot clear the NEW
          // server's timeout.  allowLoadEndRef is re-enabled by the new
          // WebView's onLoadStart above.
          if (!allowLoadEndRef.current) return;
          clearLoadTimeout();
          setIsLoading(false);
        }}
        onError={handleServerError}
        onHttpError={(statusCode) => {
          if (statusCode >= 400) handleServerError();
        }}
      />

      {/* ── Full-screen tap catcher ────────────────────────────────────────── */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handlePress}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none" />
      </Pressable>

      {/* ── Seek feedback ─────────────────────────────────────────────────── */}
      {seekFeedback != null && (
        <Animated.View
          style={[
            styles.seekFeedback,
            seekFeedback === 'left' ? styles.seekLeft : styles.seekRight,
            { opacity: seekFeedbackOpacity },
          ]}
          pointerEvents="none"
        >
          <Ionicons name={seekFeedback === 'left' ? 'play-back' : 'play-forward'} size={28} color="#fff" />
          <Text style={styles.seekText}>{t('seek_seconds')}</Text>
        </Animated.View>
      )}

      {/* ── Loading overlay ────────────────────────────────────────────────── */}
      {isLoading && !hasError && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#e50914" />
          <Text style={styles.loaderText}>{t('player_loading')}</Text>
          <Text style={styles.loaderServer}>{server.name}</Text>
        </View>
      )}

      {/* ── All-servers-failed error ───────────────────────────────────────── */}
      {hasError && (
        <View style={styles.errorOverlay}>
          <Ionicons name="warning-outline" size={52} color="#e50914" />
          <Text style={styles.errorTitle}>{t('player_error_title')}</Text>
          <Text style={styles.errorMessage}>{t('player_error_message')}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              // Reset everything and start from the first server again.
              setFailedAndRef(new Set());
              switchServer(SERVERS[0]);
            }}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>{t('player_retry')}</Text>
          </Pressable>
          <Pressable style={styles.goBackBtn} onPress={handleExit}>
            <Text style={styles.goBackText}>{t('player_go_back')}</Text>
          </Pressable>
        </View>
      )}

      {/* ── Auto-fallback toast ────────────────────────────────────────────── */}
      {!!autoFallbackMsg && (
        <View style={styles.toast} pointerEvents="none">
          <Ionicons name="swap-horizontal" size={14} color="#fff" />
          <Text style={styles.toastText}>{autoFallbackMsg}</Text>
        </View>
      )}

      {/* ── Controls overlay ──────────────────────────────────────────────── */}
      {controlsVisible && (
        <Animated.View style={[styles.controls, { opacity: controlsOpacity }]} pointerEvents="box-none">

          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable onPress={handleExit} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </Pressable>

            <View style={styles.titleBlock} pointerEvents="none">
              <Text style={styles.movieTitle} numberOfLines={1}>{displayTitle}</Text>
              {/* Current server name — always visible in the top bar */}
              <View style={styles.serverBadge}>
                <Ionicons name="wifi" size={11} color="#e50914" />
                <Text style={styles.serverBadgeText}>{server.name}</Text>
              </View>
            </View>

            <View style={styles.topActions}>
              <Pressable style={styles.topBtn} onPress={() => { showControls(); setShowSubtitleSelector(true); }}>
                <Ionicons name="text" size={20} color="#fff" />
              </Pressable>
              <Pressable style={styles.topBtn} onPress={() => { showControls(); setShowQualitySelector(true); }}>
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
                <View style={styles.ccChip}>
                  <Text style={styles.ccChipText}>CC</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Watch Party ───────────────────────────────────────────────────── */}
      {!!partyId && (
        <>
          <PartySyncBar
            isHost={partyIsHost}
            playback={partyPlayback}
            onSetPlayback={(patch) => { if (user) setPartyPlayback(patch, user.uid); }}
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

      {/* ── Modals ────────────────────────────────────────────────────────── */}
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

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  embed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },

  // ── Loading
  loaderOverlay: {
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
  loaderServer: {
    color: '#e50914',
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Error
  errorOverlay: {
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
    paddingVertical: 13,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  goBackBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  goBackText: {
    color: '#aaa',
    fontSize: 14,
  },

  // ── Toast
  toast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
  },

  // ── Controls
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
  titleBlock: {
    flex: 1,
    marginHorizontal: 8,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  serverBadgeText: {
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
  ccChip: {
    backgroundColor: 'rgba(229,9,20,0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#e50914',
  },
  ccChipText: {
    color: '#e50914',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Seek feedback
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
  seekLeft:  { left: 40 },
  seekRight: { right: 40 },
  seekText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default PlayerScreen;
