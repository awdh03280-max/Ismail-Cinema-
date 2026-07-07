import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ND } from '../utils/animation';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Platform,
} from 'react-native';
import StreamEmbed from '../components/player/StreamEmbed';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  SERVERS,
  StreamingServer,
  Quality,
  SubtitleLanguage,
  getDefaultServer,
  getNextServer,
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

const { width, height } = Dimensions.get('window');

// How often (ms) to auto-save progress
const SAVE_INTERVAL_MS = 30_000;

interface PlayerParams {
  movieId: string;
  title: string;
  poster: string;
  /** 'movie' | 'tv' — drives which streaming URL path to use */
  contentType?: 'movie' | 'tv';
  /** Runtime in minutes, used to calculate % progress */
  runtimeMinutes?: number;
  /** Resume from saved position 0-100 */
  initialProgress?: number;
  /** Season number (TV episodes only) */
  season?: number;
  /** Episode number (TV episodes only) */
  episode?: number;
  /** Episode title shown in the top bar (TV only) */
  episodeTitle?: string;
}

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
  }: PlayerParams = route.params;

  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

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

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    StatusBar.setHidden(true, 'fade');

    // Register movie in Continue Watching immediately
    addToContinueWatching({
      imdbID: movieId,
      title,
      poster,
      contentType,
      progress: initialProgress,
      watchedAt: Date.now(),
    });

    // Load saved playback position
    loadSavedPosition();

    // Auto-hide controls after 4 s
    scheduleHideControls();

    // Save progress periodically
    saveIntervalRef.current = setInterval(saveProgress, SAVE_INTERVAL_MS);

    // Android back button
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleExit();
      return true;
    });

    return () => {
      StatusBar.setHidden(false, 'fade');
      clearTimers();
      backSub.remove();
      saveProgress(); // final save on unmount
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
  };

  // ── Progress ───────────────────────────────────────────────────────────────

  const computeProgress = (): number => {
    if (runtimeMinutes > 0) {
      const elapsedMinutes = (Date.now() - sessionStartTime.current) / 60_000;
      const computed = savedProgress.current + (elapsedMinutes / runtimeMinutes) * 100;
      return Math.min(Math.round(computed), 99); // cap at 99 until explicitly finished
    }
    // No runtime available — estimate 1% per minute up to 99%
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
    }, 4000);
  };

  const showControls = () => {
    setControlsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: ND,
    }).start();
    scheduleHideControls();
  };

  const toggleControls = () => {
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
  };

  // ── Server management ─────────────────────────────────────────────────────

  const switchServer = (next: StreamingServer) => {
    // Checkpoint progress BEFORE resetting the session timer so we don't regress
    savedProgress.current = computeProgress();
    sessionStartTime.current = Date.now();
    errorHandledRef.current = false;
    setServer(next);
    setIsLoading(true);
    setHasError(false);
    showControls();
  };

  const handleServerError = () => {
    // Guard against double-fire from onError + onHttpError on the same load
    if (errorHandledRef.current) return;
    errorHandledRef.current = true;

    const newFailed = new Set(failedServers).add(server.id);
    setFailedServers(newFailed);

    // Find the next server that hasn't failed
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

  const handleExit = async () => {
    await saveProgress();
    navigation.goBack();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Mark episode watched when player opens (TV episodes only)
  useEffect(() => {
    if (contentType === 'tv' && season != null && episode != null) {
      markEpisodeWatched(movieId, season, episode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const streamUrl = server.getUrl(movieId, quality, subtitle, contentType, season, episode);
  const displayTitle = (contentType === 'tv' && season != null && episode != null && episodeTitle)
    ? `S${season}:E${episode} · ${episodeTitle}`
    : title;

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* ── Stream embed (WebView on native, iframe on web) ─────────────── */}
      <TouchableOpacity
        activeOpacity={1}
        style={StyleSheet.absoluteFill}
        onPress={toggleControls}
      >
        <StreamEmbed
          uri={streamUrl}
          style={styles.webView}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={handleServerError}
        />
      </TouchableOpacity>

      {/* ── Loading overlay ─────────────────────────────────────────────── */}
      {isLoading && (
        <View style={styles.loaderContainer} pointerEvents="none">
          <ActivityIndicator size="large" color="#e50914" />
          <Text style={styles.loaderText}>Loading stream…</Text>
        </View>
      )}

      {/* ── All-servers failed error ─────────────────────────────────────── */}
      {hasError && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#e50914" />
          <Text style={styles.errorTitle}>Stream Unavailable</Text>
          <Text style={styles.errorMessage}>
            All servers are currently unavailable. Please try again later.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setFailedServers(new Set());
              switchServer(SERVERS[0]);
            }}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>Retry All Servers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exitFromErrorBtn} onPress={handleExit}>
            <Text style={styles.exitFromErrorText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Auto-fallback toast ──────────────────────────────────────────── */}
      {!!autoFallbackMsg && (
        <View style={styles.toast} pointerEvents="none">
          <Ionicons name="swap-horizontal" size={14} color="#fff" />
          <Text style={styles.toastText}>{autoFallbackMsg}</Text>
        </View>
      )}

      {/* ── Controls overlay ─────────────────────────────────────────────── */}
      {controlsVisible && (
        <Animated.View style={[styles.controls, { opacity: controlsOpacity }]} pointerEvents="box-none">
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleExit} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.titleContainer} pointerEvents="none">
              <Text style={styles.movieTitle} numberOfLines={1}>{displayTitle}</Text>
              <View style={styles.serverTag}>
                <Ionicons name="wifi" size={11} color="#e50914" />
                <Text style={styles.serverTagText}>{server.name}</Text>
              </View>
            </View>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.topBtn}
                onPress={() => {
                  showControls();
                  setShowSubtitleSelector(true);
                }}
              >
                <Ionicons name="text" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.topBtn}
                onPress={() => {
                  showControls();
                  setShowQualitySelector(true);
                }}
              >
                <Ionicons name="settings-sharp" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.serverBtn}
              onPress={() => {
                showControls();
                setShowServerSelector(true);
              }}
            >
              <Ionicons name="layers" size={16} color="#fff" />
              <Text style={styles.serverBtnText}>Server: {server.name}</Text>
              <Ionicons name="chevron-up" size={14} color="#aaa" />
            </TouchableOpacity>

            <View style={styles.bottomRight}>
              <TouchableOpacity
                style={styles.qualityChip}
                onPress={() => {
                  showControls();
                  setShowQualitySelector(true);
                }}
              >
                <Text style={styles.qualityChipText}>{quality.toUpperCase()}</Text>
              </TouchableOpacity>

              {subtitle !== 'off' && (
                <View style={styles.subtitleChip}>
                  <Text style={styles.subtitleChipText}>CC</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
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
    flex: 1,
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
});

export default PlayerScreen;
