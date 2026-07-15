/**
 * EpisodeBrowser — Cinema Box-style professional TV/Anime episode browser.
 *
 * Features:
 *  - Season tabs with watched-progress indicators
 *  - Animated fade+slide transition when switching seasons
 *  - "Continue Watching" banner with next unwatched episode
 *  - Episode cards: 16:9 thumbnail, ep number, title, runtime, air date,
 *    overview, Watch button, Mark Watched toggle
 *  - Per-season watched tracking persisted to AsyncStorage
 *  - Auto-continue: opens the first unwatched episode of the last-active season
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  findNodeHandle,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getTVSeasonDetails, TVEpisode, TVSeasonInfo } from '../api/tmdb';
import {
  getWatchedEpisodesForShow,
  markEpisodeWatched,
  unmarkEpisodeWatched,
  getLastWatchedEpisode,
} from '../storage/storage';
import { colors } from '../theme/colors';
import { ND } from '../utils/animation';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EpisodeBrowserProps {
  showId: string;
  seasons: TVSeasonInfo[];
  onPlayEpisode: (season: number, episode: TVEpisode) => void;
  /** Fired once the continue episode for the initial season has been
   * determined (or found to be null) — used by the parent screen to
   * auto-scroll to it. */
  onContinueEpisodeReady?: (hasContinueTarget: boolean) => void;
}

/** Imperative handle exposed to the parent so it can auto-scroll its own
 * outer ScrollView to the "Continue" episode card once layout settles. */
export interface EpisodeBrowserHandle {
  scrollToContinueEpisode: (outerScrollView: ScrollView | null, topOffset?: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatRuntime = (rt: number | null): string =>
  rt ? `${rt} min` : '';

const formatAirDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatAirYear = (dateStr: string): string => {
  if (!dateStr) return '';
  return dateStr.substring(0, 4);
};

// ── Season Progress Ring ───────────────────────────────────────────────────────

const SeasonProgressDot: React.FC<{
  total: number;
  watched: number;
  active: boolean;
}> = ({ total, watched, active }) => {
  if (total === 0) return null;
  const pct = Math.min(1, watched / total);
  const isComplete = pct >= 1;
  return (
    <View
      style={[
        progressDotStyles.wrap,
        active && progressDotStyles.wrapActive,
        isComplete && progressDotStyles.wrapComplete,
      ]}
    >
      <Text style={[progressDotStyles.text, active && progressDotStyles.textActive]}>
        {watched}/{total}
      </Text>
    </View>
  );
};

const progressDotStyles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  wrapActive: {
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderColor: 'rgba(212,175,55,0.45)',
  },
  wrapComplete: {
    backgroundColor: 'rgba(45,181,45,0.18)',
    borderColor: 'rgba(45,181,45,0.45)',
  },
  text: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  textActive: {
    color: colors.gold,
  },
});

// ── Episode Card ──────────────────────────────────────────────────────────────

interface EpisodeCardProps {
  episode: TVEpisode;
  watched: boolean;
  isContinue?: boolean;
  onPlay: () => void;
  onToggleWatched: () => void;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode: ep,
  watched,
  isContinue = false,
  onPlay,
  onToggleWatched,
}) => {
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: ND,
      speed: 30,
      bounciness: 0,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: ND,
      speed: 20,
      bounciness: 3,
    }).start();
  };

  const runtime = formatRuntime(ep.runtime);
  const airDate = formatAirDate(ep.air_date);
  const hasStill = !!ep.still_path;

  return (
    <Animated.View style={[cardStyles.card, { transform: [{ scale: scaleAnim }] }, isContinue && cardStyles.cardHighlight]}>
      {isContinue && (
        <View style={cardStyles.continueBadge}>
          <Ionicons name="play-circle" size={12} color="#000" />
          <Text style={cardStyles.continueBadgeText}>CONTINUE</Text>
        </View>
      )}

      {/* ── Thumbnail row ── */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPlay}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={cardStyles.thumbRow}
      >
        {/* Thumbnail */}
        <View style={cardStyles.thumbWrap}>
          {hasStill ? (
            <Image
              source={{ uri: ep.still_path! }}
              style={cardStyles.thumbImage}
              resizeMode="cover"
            />
          ) : (
            <View style={cardStyles.thumbPlaceholder}>
              <Ionicons name="film-outline" size={24} color={colors.textMuted} />
            </View>
          )}

          {/* Dark gradient over thumbnail */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Episode number badge */}
          <View style={cardStyles.epNumBadge}>
            <Text style={cardStyles.epNumText}>
              E{String(ep.episode_number).padStart(2, '0')}
            </Text>
          </View>

          {/* Watched overlay */}
          {watched && (
            <View style={cardStyles.watchedOverlay}>
              <View style={cardStyles.watchedCircle}>
                <Ionicons name="checkmark" size={18} color="#000" />
              </View>
            </View>
          )}

          {/* Play icon hover overlay */}
          {!watched && (
            <View style={cardStyles.playOverlay}>
              <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.85)" />
            </View>
          )}
        </View>

        {/* Episode top info */}
        <View style={cardStyles.infoBlock}>
          <Text style={cardStyles.epTitle} numberOfLines={2}>
            {ep.name}
          </Text>

          {/* Meta chips */}
          <View style={cardStyles.metaRow}>
            {ep.vote_average > 0 && (
              <View style={cardStyles.ratingChip}>
                <Ionicons name="star" size={10} color={colors.gold} />
                <Text style={cardStyles.ratingText}>{ep.vote_average.toFixed(1)}</Text>
              </View>
            )}
            {!!runtime && (
              <View style={cardStyles.metaChip}>
                <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                <Text style={cardStyles.metaText}>{runtime}</Text>
              </View>
            )}
            {!!airDate && (
              <View style={cardStyles.metaChip}>
                <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                <Text style={cardStyles.metaText}>{airDate}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Overview (expandable) ── */}
      {!!ep.overview && (
        <TouchableOpacity
          onPress={() => setOverviewExpanded((v) => !v)}
          activeOpacity={0.75}
          style={cardStyles.overviewWrap}
        >
          <Text
            style={cardStyles.overviewText}
            numberOfLines={overviewExpanded ? undefined : 2}
          >
            {ep.overview}
          </Text>
          {ep.overview.length > 100 && (
            <Text style={cardStyles.overviewToggle}>
              {overviewExpanded ? 'Show less ▲' : 'Show more ▼'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* ── Action buttons ── */}
      <View style={cardStyles.actionsRow}>
        <TouchableOpacity
          style={[cardStyles.watchBtn, isContinue && cardStyles.watchBtnHighlight]}
          onPress={onPlay}
          activeOpacity={0.82}
        >
          <LinearGradient
            colors={isContinue ? ['#d4af37', '#f4d675', '#d4af37'] : ['#ff2a35', colors.red, '#b5000c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={cardStyles.watchBtnGradient}
          >
            <Ionicons name="play" size={14} color={isContinue ? '#000' : '#fff'} />
            <Text style={[cardStyles.watchBtnText, isContinue && { color: '#000' }]}>
              {isContinue ? 'Continue' : 'Watch'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[cardStyles.markBtn, watched && cardStyles.markBtnWatched]}
          onPress={onToggleWatched}
          activeOpacity={0.78}
        >
          <Ionicons
            name={watched ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={15}
            color={watched ? '#2db52d' : colors.textMuted}
          />
          <Text style={[cardStyles.markBtnText, watched && cardStyles.markBtnTextWatched]}>
            {watched ? 'Watched' : 'Mark watched'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHighlight: {
    borderColor: 'rgba(212,175,55,0.35)',
    backgroundColor: '#161410',
  },
  continueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  continueBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  thumbWrap: {
    width: 140,
    height: 79, // 16:9
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    flexShrink: 0,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  watchedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchedCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2db52d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  epNumBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  epNumText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoBlock: {
    flex: 1,
    gap: 6,
  },
  epTitle: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  ratingText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  overviewWrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  overviewText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  overviewToggle: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  watchBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    flex: 0,
  },
  watchBtnHighlight: {},
  watchBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  watchBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceElevated,
  },
  markBtnWatched: {
    borderColor: 'rgba(45,181,45,0.35)',
    backgroundColor: 'rgba(45,181,45,0.08)',
  },
  markBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  markBtnTextWatched: {
    color: '#2db52d',
  },
});

// ── Main EpisodeBrowser ───────────────────────────────────────────────────────

const EpisodeBrowser = forwardRef<EpisodeBrowserHandle, EpisodeBrowserProps>(({
  showId,
  seasons,
  onPlayEpisode,
  onContinueEpisodeReady,
}, ref) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(
    seasons[0]?.season_number ?? 1,
  );
  const [episodes, setEpisodes] = useState<TVEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchedKeys, setWatchedKeys] = useState<Set<string>>(new Set());
  // season_number → watched count in that season
  const [seasonWatchedCounts, setSeasonWatchedCounts] = useState<Record<number, number>>({});
  const [lastWatched, setLastWatched] = useState<{
    season: number;
    episode: number;
    episodeTitle: string;
  } | null>(null);

  const mountedRef = useRef(true);
  const listFade = useRef(new Animated.Value(1)).current;
  const listSlide = useRef(new Animated.Value(0)).current;
  const seasonTabsRef = useRef<ScrollView>(null);
  const rootRef = useRef<View>(null);
  // episode id → y offset relative to the (non-animated) episode list container
  const cardOffsets = useRef<Map<number, number>>(new Map());
  const readyReportedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Load watched state ────────────────────────────────────────────────────
  const loadWatched = useCallback(async () => {
    const keys = await getWatchedEpisodesForShow(showId);
    if (!mountedRef.current) return;
    setWatchedKeys(keys);

    // Compute per-season watched counts from the flat key set
    const counts: Record<number, number> = {};
    for (const key of keys) {
      // key format: "s{season}_e{episode}"
      const match = key.match(/^s(\d+)_e\d+$/);
      if (match) {
        const s = parseInt(match[1], 10);
        counts[s] = (counts[s] ?? 0) + 1;
      }
    }
    setSeasonWatchedCounts(counts);
  }, [showId]);

  // ── Load last-watched episode ─────────────────────────────────────────────
  const loadLastWatched = useCallback(async () => {
    const lw = await getLastWatchedEpisode(showId);
    if (mountedRef.current) setLastWatched(lw);
  }, [showId]);

  // ── Load episodes for a season ────────────────────────────────────────────
  const loadEpisodes = useCallback(async (seasonNum: number) => {
    // Animate out
    await new Promise<void>((resolve) => {
      Animated.parallel([
        Animated.timing(listFade, {
          toValue: 0,
          duration: 160,
          easing: Easing.out(Easing.ease),
          useNativeDriver: ND,
        }),
        Animated.timing(listSlide, {
          toValue: 12,
          duration: 160,
          easing: Easing.out(Easing.ease),
          useNativeDriver: ND,
        }),
      ]).start(() => resolve());
    });

    setLoading(true);
    setEpisodes([]);

    try {
      const details = await getTVSeasonDetails(showId, seasonNum);
      if (!mountedRef.current) return;
      setEpisodes(details.episodes);
    } catch {
      if (mountedRef.current) setEpisodes([]);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      // Animate in
      listSlide.setValue(-12);
      Animated.parallel([
        Animated.timing(listFade, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.ease),
          useNativeDriver: ND,
        }),
        Animated.timing(listSlide, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: ND,
        }),
      ]).start();
    }
  }, [showId, listFade, listSlide]);

  useEffect(() => {
    loadWatched();
    loadLastWatched();
  }, [loadWatched, loadLastWatched]);

  // Start on the season of the last-watched episode, otherwise first season
  useEffect(() => {
    loadLastWatched().then(async () => {
      // We fetch it again to use the fresh value inside this effect
      const lw = await getLastWatchedEpisode(showId);
      if (lw && seasons.some(s => s.season_number === lw.season)) {
        setSelectedSeason(lw.season);
        loadEpisodes(lw.season);
      } else {
        loadEpisodes(seasons[0]?.season_number ?? 1);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  useEffect(() => {
    loadEpisodes(selectedSeason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeason]);

  const handleSeasonPress = (seasonNum: number) => {
    if (seasonNum === selectedSeason) return;
    setSelectedSeason(seasonNum);
  };

  const isWatched = (ep: TVEpisode) =>
    watchedKeys.has(`s${ep.season_number}_e${ep.episode_number}`);

  const toggleWatched = async (ep: TVEpisode) => {
    const key = `s${ep.season_number}_e${ep.episode_number}`;
    if (watchedKeys.has(key)) {
      await unmarkEpisodeWatched(showId, ep.season_number, ep.episode_number);
      setWatchedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setSeasonWatchedCounts((prev) => ({
        ...prev,
        [ep.season_number]: Math.max(0, (prev[ep.season_number] ?? 1) - 1),
      }));
    } else {
      await markEpisodeWatched(showId, ep.season_number, ep.episode_number);
      setWatchedKeys((prev) => new Set(prev).add(key));
      setSeasonWatchedCounts((prev) => ({
        ...prev,
        [ep.season_number]: (prev[ep.season_number] ?? 0) + 1,
      }));
    }
  };

  // ── Continue episode logic ────────────────────────────────────────────────
  // The "continue" episode is the first unwatched in the current season,
  // after the last-watched episode index.
  const continueEpisode: TVEpisode | null = (() => {
    if (episodes.length === 0) return null;
    if (lastWatched && lastWatched.season === selectedSeason) {
      // Find first unwatched episode after (or at) the last watched one
      const afterIdx = episodes.findIndex(
        (ep) => ep.episode_number > lastWatched.episode,
      );
      if (afterIdx !== -1) {
        const candidate = episodes[afterIdx];
        if (!isWatched(candidate)) return candidate;
      }
    }
    // Otherwise: first unwatched episode in the season
    return episodes.find((ep) => !isWatched(ep)) ?? null;
  })();

  // Selected season info
  const selectedSeasonInfo = seasons.find(s => s.season_number === selectedSeason);

  // ── Render ────────────────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    scrollToContinueEpisode: (outerScrollView, topOffset = 90) => {
      if (!outerScrollView || !continueEpisode) return;
      const cardY = cardOffsets.current.get(continueEpisode.id);
      const rootNode = rootRef.current;
      const scrollHandle = findNodeHandle(outerScrollView);
      if (cardY == null || !rootNode || !scrollHandle) return;
      // @ts-ignore — measureLayout exists on the underlying native view
      rootNode.measureLayout(
        scrollHandle,
        (_x: number, rootY: number) => {
          outerScrollView.scrollTo({ y: Math.max(0, rootY + cardY - topOffset), animated: true });
        },
        () => {},
      );
    },
  }), [continueEpisode]);

  // Report once per season load whether there's a continue target — the
  // parent screen uses this to decide whether to auto-scroll.
  useEffect(() => {
    if (loading) return;
    if (readyReportedRef.current) return;
    readyReportedRef.current = true;
    onContinueEpisodeReady?.(!!continueEpisode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, episodes]);

  return (
    <View style={styles.root} ref={rootRef}>

      {/* ── Section header ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.goldBar} />
        <Text style={styles.sectionTitle}>Episodes</Text>
        <View style={styles.seasonCountBadge}>
          <Text style={styles.seasonCountText}>
            {seasons.length} Season{seasons.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* ── Season tabs ── */}
      <ScrollView
        ref={seasonTabsRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.seasonRow}
      >
        {seasons.map((s) => {
          const active = s.season_number === selectedSeason;
          const watched = seasonWatchedCounts[s.season_number] ?? 0;
          const total = s.episode_count;
          return (
            <TouchableOpacity
              key={s.season_number}
              onPress={() => handleSeasonPress(s.season_number)}
              style={[styles.seasonTab, active && styles.seasonTabActive]}
              activeOpacity={0.75}
            >
              {active && (
                <View style={styles.seasonTabActiveLine} />
              )}
              <Text style={[styles.seasonTabText, active && styles.seasonTabTextActive]}>
                Season {s.season_number}
              </Text>
              <SeasonProgressDot
                total={total}
                watched={watched}
                active={active}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Season info strip ── */}
      {selectedSeasonInfo && (
        <View style={styles.seasonInfoStrip}>
          {selectedSeasonInfo.poster_path ? (
            <Image
              source={{ uri: selectedSeasonInfo.poster_path }}
              style={styles.seasonPoster}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.seasonInfoText}>
            <Text style={styles.seasonInfoName}>{selectedSeasonInfo.name}</Text>
            <View style={styles.seasonInfoMeta}>
              {!!selectedSeasonInfo.air_date && (
                <View style={styles.seasonMetaChip}>
                  <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                  <Text style={styles.seasonMetaText}>
                    {formatAirYear(selectedSeasonInfo.air_date)}
                  </Text>
                </View>
              )}
              <View style={styles.seasonMetaChip}>
                <Ionicons name="play-circle-outline" size={11} color={colors.textMuted} />
                <Text style={styles.seasonMetaText}>
                  {selectedSeasonInfo.episode_count} episode{selectedSeasonInfo.episode_count !== 1 ? 's' : ''}
                </Text>
              </View>
              {(seasonWatchedCounts[selectedSeason] ?? 0) > 0 && (
                <View style={[styles.seasonMetaChip, styles.seasonMetaChipGreen]}>
                  <Ionicons name="checkmark-circle" size={11} color="#2db52d" />
                  <Text style={[styles.seasonMetaText, { color: '#2db52d' }]}>
                    {seasonWatchedCounts[selectedSeason]} watched
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ── Animated episode list ── */}
      <Animated.View
        style={{
          opacity: listFade,
          transform: [{ translateY: listSlide }],
        }}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={styles.loadingText}>Loading episodes…</Text>
          </View>
        ) : episodes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="film-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No episodes found</Text>
            <Text style={styles.emptySubtitle}>Check back later for updates.</Text>
          </View>
        ) : (
          <View style={styles.episodeList}>
            {episodes.map((ep) => {
              const watched = isWatched(ep);
              const isContinue = continueEpisode?.id === ep.id;
              return (
                <View
                  key={ep.id}
                  onLayout={(e) => cardOffsets.current.set(ep.id, e.nativeEvent.layout.y)}
                >
                  <EpisodeCard
                    episode={ep}
                    watched={watched}
                    isContinue={isContinue}
                    onPlay={() => onPlayEpisode(ep.season_number, ep)}
                    onToggleWatched={() => toggleWatched(ep)}
                  />
                </View>
              );
            })}
          </View>
        )}
      </Animated.View>
    </View>
  );
});

EpisodeBrowser.displayName = 'EpisodeBrowser';

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    marginTop: 32,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  goldBar: {
    width: 4,
    height: 20,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  sectionTitle: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  seasonCountBadge: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  seasonCountText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
  },

  // Season tabs
  seasonRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
    paddingBottom: 0,
  },
  seasonTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  seasonTabActive: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderColor: 'rgba(212,175,55,0.5)',
  },
  seasonTabActiveLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.gold,
  },
  seasonTabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  seasonTabTextActive: {
    color: colors.gold,
    fontWeight: '800',
  },

  // Season info strip
  seasonInfoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 14,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
  },
  seasonPoster: {
    width: 44,
    height: 66,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
  },
  seasonInfoText: {
    flex: 1,
    gap: 6,
  },
  seasonInfoName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  seasonInfoMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  seasonMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seasonMetaChipGreen: {},
  seasonMetaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },

  // Loading / empty
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },

  // Episode list
  episodeList: {
    gap: 0,
    paddingBottom: 8,
  },
});

export default EpisodeBrowser;
