/**
 * Achievements System — type definitions.
 * Connected to Firestore under users/{uid} (xp, level, stats, achievements).
 */

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;          // Ionicons name
  xpReward: number;
  category: AchievementCategory;
  /** For progress-based achievements: the target count */
  target?: number;
}

export type AchievementCategory =
  | 'movies'
  | 'series'
  | 'social'
  | 'streak'
  | 'level';

export type AchievementId =
  | 'first_movie'
  | 'movies_10'
  | 'movies_50'
  | 'movies_100'
  | 'first_series'
  | 'episodes_50'
  | 'anime_fan'
  | 'animation_fan'
  | 'first_comment'
  | 'comments_10'
  | 'comments_100'
  | 'streak_7'
  | 'streak_30'
  | 'level_10'
  | 'level_25'
  | 'level_50'
  | 'level_100'
  | 'level_150';

/** Stored in Firestore under users/{uid}.achievements */
export interface AchievementRecord {
  unlockedAt: number; // Unix ms timestamp
  xpAwarded: number;
}

/** User XP + level stats stored in Firestore */
export interface UserStats {
  xp: number;
  level: number;
  moviesWatched: number;
  seriesWatched: number;
  episodesWatched: number;
  commentsCount: number;
  animeWatched: number;
  animationWatched: number;
  loginStreak: number;
  lastLoginDate: string; // 'YYYY-MM-DD'
}

export interface UnlockedAchievement {
  achievement: Achievement;
  unlockedAt: number;
}

export interface XPContextType {
  xp: number;
  level: number;
  xpToNextLevel: number;
  xpProgress: number; // 0–1 fraction within current level
  stats: UserStats;
  unlockedIds: Set<AchievementId>;
  allAchievements: Achievement[];
  trackContentWatched: (params: {
    contentType: 'movie' | 'tv';
    genres?: string[];
    isNewEpisode?: boolean;
  }) => Promise<void>;
  trackComment: () => Promise<void>;
  isLoading: boolean;
}
