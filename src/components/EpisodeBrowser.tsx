import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTVSeasonDetails, TVEpisode, TVSeasonInfo } from '../api/tmdb';
import {
  getWatchedEpisodesForShow,
  markEpisodeWatched,
  unmarkEpisodeWatched,
} from '../storage/storage';
import { colors } from '../theme/colors';

interface EpisodeBrowserProps {
  showId: string;
  seasons: TVSeasonInfo[];
  onPlayEpisode: (season: number, episode: TVEpisode) => void;
}

const STILL_PLACEHOLDER = 'https://via.placeholder.com/300x169/141414/d4af37?text=No+Image';

const EpisodeBrowser: React.FC<EpisodeBrowserProps> = ({
  showId,
  seasons,
  onPlayEpisode,
}) => {
  const [selectedSeason, setSelectedSeason] = useState<number>(
    seasons[0]?.season_number ?? 1
  );
  const [episodes, setEpisodes] = useState<TVEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchedKeys, setWatchedKeys] = useState<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadWatched = useCallback(async () => {
    const keys = await getWatchedEpisodesForShow(showId);
    if (mountedRef.current) setWatchedKeys(keys);
  }, [showId]);

  const loadEpisodes = useCallback(async (seasonNum: number) => {
    setLoading(true);
    try {
      const details = await getTVSeasonDetails(showId, seasonNum);
      if (mountedRef.current) setEpisodes(details.episodes);
    } catch {
      if (mountedRef.current) setEpisodes([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    loadEpisodes(selectedSeason);
    loadWatched();
  }, [selectedSeason, loadEpisodes, loadWatched]);

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
    } else {
      await markEpisodeWatched(showId, ep.season_number, ep.episode_number);
      setWatchedKeys((prev) => new Set(prev).add(key));
    }
  };

  const formatRuntime = (rt: number | null) =>
    rt ? `${rt} min` : '';

  const formatAirDate = (dateStr: string) => {
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

  return (
    <View style={styles.root}>
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

      {/* ── Season selector ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.seasonRow}
      >
        {seasons.map((s) => {
          const active = s.season_number === selectedSeason;
          return (
            <TouchableOpacity
              key={s.season_number}
              onPress={() => handleSeasonPress(s.season_number)}
              style={[styles.seasonTab, active && styles.seasonTabActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.seasonTabText, active && styles.seasonTabTextActive]}>
                Season {s.season_number}
              </Text>
              {s.episode_count > 0 && (
                <View style={[styles.epCountDot, active && styles.epCountDotActive]}>
                  <Text style={[styles.epCountText, active && styles.epCountTextActive]}>
                    {s.episode_count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Episode list ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.gold} />
          <Text style={styles.loadingText}>Loading episodes…</Text>
        </View>
      ) : episodes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="film-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>No episodes found</Text>
        </View>
      ) : (
        <View style={styles.episodeList}>
          {episodes.map((ep) => {
            const watched = isWatched(ep);
            return (
              <View key={ep.id} style={styles.episodeCard}>
                {/* Still image + watched overlay */}
                <View style={styles.stillWrap}>
                  <Image
                    source={{ uri: ep.still_path ?? STILL_PLACEHOLDER }}
                    style={styles.stillImage}
                    resizeMode="cover"
                  />
                  {watched && (
                    <View style={styles.watchedOverlay}>
                      <Ionicons name="checkmark-circle" size={28} color={colors.gold} />
                    </View>
                  )}
                  <View style={styles.epNumBadge}>
                    <Text style={styles.epNumText}>{ep.episode_number}</Text>
                  </View>
                </View>

                {/* Episode info */}
                <View style={styles.epInfo}>
                  <View style={styles.epTopRow}>
                    <Text style={styles.epTitle} numberOfLines={2}>
                      {ep.name}
                    </Text>
                    {ep.vote_average > 0 && (
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={10} color={colors.gold} />
                        <Text style={styles.ratingText}>
                          {ep.vote_average.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.epMeta}>
                    {!!formatRuntime(ep.runtime) && (
                      <View style={styles.metaChip}>
                        <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.metaText}>{formatRuntime(ep.runtime)}</Text>
                      </View>
                    )}
                    {!!ep.air_date && (
                      <Text style={styles.airDate}>{formatAirDate(ep.air_date)}</Text>
                    )}
                  </View>

                  {!!ep.overview && (
                    <Text style={styles.epOverview} numberOfLines={2}>
                      {ep.overview}
                    </Text>
                  )}

                  {/* Action buttons */}
                  <View style={styles.epActions}>
                    <TouchableOpacity
                      style={styles.playBtn}
                      onPress={() => onPlayEpisode(ep.season_number, ep)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play" size={13} color="#fff" />
                      <Text style={styles.playBtnText}>Play</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.watchedBtn, watched && styles.watchedBtnActive]}
                      onPress={() => toggleWatched(ep)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={watched ? 'checkmark-circle' : 'checkmark-circle-outline'}
                        size={14}
                        color={watched ? colors.gold : colors.textMuted}
                      />
                      <Text style={[styles.watchedBtnText, watched && styles.watchedBtnTextActive]}>
                        {watched ? 'Watched' : 'Mark Watched'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  goldBar: {
    width: 4,
    height: 18,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  sectionTitle: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flex: 1,
  },
  seasonCountBadge: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  seasonCountText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Season tabs ──
  seasonRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
    paddingBottom: 16,
  },
  seasonTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  seasonTabActive: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderColor: 'rgba(212,175,55,0.55)',
  },
  seasonTabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  seasonTabTextActive: {
    color: colors.gold,
    fontWeight: '700',
  },
  epCountDot: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  epCountDotActive: {
    backgroundColor: 'rgba(212,175,55,0.3)',
  },
  epCountText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  epCountTextActive: {
    color: colors.gold,
  },

  // ── Loading / empty ──
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },

  // ── Episode list ──
  episodeList: {
    gap: 1,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    alignItems: 'flex-start',
  },

  // ── Still image ──
  stillWrap: {
    width: 110,
    height: 62,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    flexShrink: 0,
  },
  stillImage: {
    width: '100%',
    height: '100%',
  },
  watchedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  epNumBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  epNumText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Episode info ──
  epInfo: {
    flex: 1,
    gap: 4,
  },
  epTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  epTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  ratingText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  epMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  airDate: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  epOverview: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  epActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.red,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  playBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  watchedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceElevated,
  },
  watchedBtnActive: {
    borderColor: 'rgba(212,175,55,0.4)',
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  watchedBtnText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  watchedBtnTextActive: {
    color: colors.gold,
  },
});

export default EpisodeBrowser;
