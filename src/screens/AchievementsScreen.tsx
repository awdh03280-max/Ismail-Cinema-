/**
 * AchievementsScreen — premium Black + Gold + Red achievements page.
 *
 * Shows all 18 achievements grouped by category with:
 *  - Unlock status, unlock date, XP reward
 *  - Progress bars for locked achievements (where a stat target exists)
 *  - XP level card at the top
 *  - Smooth entrance animations
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useXP } from '../context/XPContext';
import { Achievement, AchievementCategory, AchievementId } from '../types/achievements';
import { colors } from '../theme/colors';
import { XP_PER_LEVEL, MAX_LEVEL } from '../data/achievements';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Category config ────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  AchievementCategory,
  { label: string; icon: string; color: string }
> = {
  movies: { label: 'Movies', icon: 'film', color: colors.red },
  series: { label: 'Series & Genres', icon: 'tv', color: '#6c63ff' },
  social: { label: 'Social', icon: 'chatbubbles', color: '#2db52d' },
  streak: { label: 'Login Streaks', icon: 'flame', color: '#ff8c00' },
  level: { label: 'XP Levels', icon: 'star', color: colors.gold },
};

const CATEGORIES: AchievementCategory[] = [
  'movies',
  'series',
  'social',
  'streak',
  'level',
];

// ── Progress helper ─────────────────────────────────────────────────────────────

function getProgress(
  achievement: Achievement,
  stats: any,
  unlockedIds: Set<AchievementId>
): number {
  if (unlockedIds.has(achievement.id)) return 1;
  if (!achievement.target) return 0;

  const stat: Partial<Record<AchievementId, number>> = {
    first_movie: stats.moviesWatched,
    movies_10: stats.moviesWatched,
    movies_50: stats.moviesWatched,
    movies_100: stats.moviesWatched,
    first_series: stats.seriesWatched,
    episodes_50: stats.episodesWatched,
    anime_fan: stats.animeWatched,
    animation_fan: stats.animationWatched,
    first_comment: stats.commentsCount,
    comments_10: stats.commentsCount,
    comments_100: stats.commentsCount,
    streak_7: stats.loginStreak,
    streak_30: stats.loginStreak,
    level_10: stats.level,
    level_25: stats.level,
    level_50: stats.level,
    level_100: stats.level,
    level_150: stats.level,
    // daily_reward_badge has no numeric progress — it's claimed or not
    daily_reward_badge: 0,
  };

  const current = stat[achievement.id] ?? 0;
  return Math.min(current / achievement.target, 0.99);
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  index: number;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  unlocked,
  unlockedAt,
  progress,
  index,
}) => {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 40;
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: false,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 600,
      delay: delay + 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const catConfig = CATEGORY_CONFIG[achievement.category];

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
        unlocked && styles.cardUnlocked,
      ]}
    >
      <LinearGradient
        colors={
          unlocked
            ? ['#1a1200', '#0d0d0d', '#1a0900']
            : ['#0d0d0d', '#111', '#0d0d0d']
        }
        style={styles.cardGradient}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconBox,
            unlocked
              ? styles.iconBoxUnlocked
              : styles.iconBoxLocked,
            unlocked && { borderColor: catConfig.color },
          ]}
        >
          <Ionicons
            name={achievement.icon as any}
            size={22}
            color={unlocked ? catConfig.color : '#444'}
          />
          {unlocked && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
            </View>
          )}
        </View>

        {/* Text */}
        <View style={styles.cardText}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[styles.cardName, !unlocked && styles.cardNameLocked]}
              numberOfLines={1}
            >
              {achievement.name}
            </Text>
            {achievement.xpReward > 0 && (
              <View
                style={[
                  styles.xpChip,
                  !unlocked && styles.xpChipLocked,
                ]}
              >
                <Text
                  style={[styles.xpChipText, !unlocked && styles.xpChipTextLocked]}
                >
                  +{achievement.xpReward} XP
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.cardDesc} numberOfLines={2}>
            {achievement.description}
          </Text>

          {unlocked && unlockedAt ? (
            <Text style={styles.unlockedDate}>
              Unlocked {formatDate(unlockedAt)}
            </Text>
          ) : achievement.target ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[styles.progressFill, { width: progressWidth }]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {Math.round(progress * achievement.target)}/{achievement.target}
              </Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      {unlocked && <View style={styles.cardGoldLine} />}
    </Animated.View>
  );
};

// ── Main screen ────────────────────────────────────────────────────────────────

const AchievementsScreen: React.FC = () => {
  const { xp, level, xpProgress, xpToNextLevel, stats, unlockedIds, achievementDates, allAchievements, isLoading } =
    useXP();

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#000000');
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const unlockedCount = unlockedIds.size;
  const totalCount = allAchievements.length;

  // Group by category
  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    achievements: allAchievements.filter(a => a.category === cat),
  }));

  // XP progress bar width
  const xpBarWidth = `${Math.round(xpProgress * 100)}%`;

  // achievementDates now comes from XPContext — maps id → unlockedAt timestamp

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── XP Level Card ─────────────────────────────────────────────── */}
        <Animated.View style={[styles.xpCard, { opacity: headerAnim }]}>
          <LinearGradient
            colors={['#1a1200', '#0d0d0d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.xpCardGradient}
          >
            <View style={styles.xpCardRow}>
              <View>
                <Text style={styles.xpLevelLabel}>LEVEL</Text>
                <Text style={styles.xpLevelValue}>{level}</Text>
              </View>

              <View style={styles.xpCenter}>
                <Text style={styles.xpTotal}>{xp.toLocaleString()} XP</Text>
                <View style={styles.xpBar}>
                  <View style={[styles.xpBarFill, { width: xpBarWidth as any }]} />
                </View>
                <Text style={styles.xpNextLabel}>
                  {level >= MAX_LEVEL ? '✨ Max Level Reached' : `${xpToNextLevel} XP to next level`}
                </Text>
              </View>

              <View style={styles.xpRight}>
                <View style={styles.achievementBadge}>
                  <Text style={styles.achievementBadgeCount}>{unlockedCount}</Text>
                  <Text style={styles.achievementBadgeOf}>/{totalCount}</Text>
                </View>
                <Text style={styles.achievementBadgeLabel}>Unlocked</Text>
              </View>
            </View>

            {/* Overall progress */}
            {(() => {
              const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
              return (
                <>
                  <View style={styles.overallBar}>
                    <View style={[styles.overallBarFill, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={styles.overallLabel}>{pct}% Complete</Text>
                </>
              );
            })()}
          </LinearGradient>
          <View style={styles.xpCardGoldBorder} />
        </Animated.View>

        {/* ── Category Groups ────────────────────────────────────────────── */}
        {grouped.map(({ category, achievements }) => {
          const cfg = CATEGORY_CONFIG[category];
          const unlockedInCat = achievements.filter(a => unlockedIds.has(a.id)).length;

          return (
            <View key={category} style={styles.categorySection}>
              {/* Category header */}
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryDot, { backgroundColor: cfg.color }]} />
                <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                <Text style={styles.categoryLabel}>{cfg.label}</Text>
                <View style={styles.categoryCount}>
                  <Text style={styles.categoryCountText}>
                    {unlockedInCat}/{achievements.length}
                  </Text>
                </View>
              </View>

              {/* Achievement cards */}
              {achievements.map((achievement, idx) => {
                const unlocked = unlockedIds.has(achievement.id);
                const progress = getProgress(achievement, stats, unlockedIds);
                return (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    unlocked={unlocked}
                    unlockedAt={achievementDates[achievement.id]}
                    progress={progress}
                    index={idx}
                  />
                );
              })}
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Keep watching to unlock more achievements</Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { paddingBottom: 80 },

  // XP Card
  xpCard: {
    margin: 16,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  xpCardGradient: { padding: 20 },
  xpCardGoldBorder: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: colors.gold,
    opacity: 0.7,
    borderRadius: 1,
  },
  xpCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  xpLevelLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
  },
  xpLevelValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 46,
  },
  xpCenter: { flex: 1, paddingHorizontal: 16 },
  xpTotal: { fontSize: 18, fontWeight: '800', color: colors.gold, marginBottom: 8 },
  xpBar: {
    height: 6,
    backgroundColor: 'rgba(212,175,55,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  xpBarFill: {
    height: 6,
    backgroundColor: colors.gold,
    borderRadius: 3,
  },
  xpNextLabel: { fontSize: 10, color: '#888' },
  xpRight: { alignItems: 'center' },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  achievementBadgeCount: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.red,
  },
  achievementBadgeOf: { fontSize: 14, color: '#666', fontWeight: '600' },
  achievementBadgeLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  overallBar: {
    height: 3,
    backgroundColor: 'rgba(229,9,20,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  overallBarFill: {
    height: 3,
    backgroundColor: colors.red,
    borderRadius: 2,
  },
  overallLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
  },

  // Category
  categorySection: { marginBottom: 8 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  categoryDot: { width: 3, height: 18, borderRadius: 2 },
  categoryLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  categoryCount: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryCountText: { fontSize: 11, color: '#888', fontWeight: '600' },

  // Achievement Card
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  cardUnlocked: {
    borderColor: 'rgba(212,175,55,0.35)',
  },
  cardGradient: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  iconBoxUnlocked: { backgroundColor: '#1a1200', borderColor: colors.gold },
  iconBoxLocked: { backgroundColor: '#111', borderColor: '#2a2a2a' },
  checkBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  cardText: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  cardName: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
  cardNameLocked: { color: '#666' },
  xpChip: {
    backgroundColor: 'rgba(229,9,20,0.2)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.red,
  },
  xpChipLocked: {
    backgroundColor: 'rgba(100,100,100,0.1)',
    borderColor: '#333',
  },
  xpChipText: { fontSize: 10, fontWeight: '700', color: colors.red },
  xpChipTextLocked: { color: '#555' },
  cardDesc: { fontSize: 11, color: '#777', lineHeight: 15 },
  unlockedDate: { fontSize: 10, color: colors.gold, marginTop: 5, fontWeight: '600' },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#222',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  progressLabel: { fontSize: 10, color: '#666', minWidth: 40, textAlign: 'right' },

  // Gold accent line on unlocked cards
  cardGoldLine: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: colors.gold,
    borderRadius: 2,
    opacity: 0.8,
  },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { fontSize: 12, color: '#444', fontStyle: 'italic' },
});

export default AchievementsScreen;
