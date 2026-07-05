/**
 * Achievements — master definition list.
 * Each entry maps to an AchievementId; Firestore stores only the unlock record.
 */
import { Achievement } from '../types/achievements';

export const ACHIEVEMENTS: Achievement[] = [
  // ── Movies ──────────────────────────────────────────────────────────────────
  {
    id: 'first_movie',
    name: 'First Movie',
    description: 'Watch your very first movie.',
    icon: 'film-outline',
    xpReward: 100,
    category: 'movies',
    target: 1,
  },
  {
    id: 'movies_10',
    name: 'Movie Marathon',
    description: 'Watch 10 movies in total.',
    icon: 'videocam-outline',
    xpReward: 250,
    category: 'movies',
    target: 10,
  },
  {
    id: 'movies_50',
    name: 'Cinephile',
    description: 'Watch 50 movies in total.',
    icon: 'film',
    xpReward: 500,
    category: 'movies',
    target: 50,
  },
  {
    id: 'movies_100',
    name: 'Century Club',
    description: 'Watch 100 movies — a true legend.',
    icon: 'trophy-outline',
    xpReward: 1000,
    category: 'movies',
    target: 100,
  },
  // ── Series ───────────────────────────────────────────────────────────────────
  {
    id: 'first_series',
    name: 'First Series',
    description: 'Start watching your first TV series.',
    icon: 'tv-outline',
    xpReward: 100,
    category: 'series',
    target: 1,
  },
  {
    id: 'episodes_50',
    name: 'Binge Watcher',
    description: 'Watch 50 episodes across any series.',
    icon: 'play-circle-outline',
    xpReward: 500,
    category: 'series',
    target: 50,
  },
  {
    id: 'anime_fan',
    name: 'Anime Fan',
    description: 'Watch 5 anime titles.',
    icon: 'star-outline',
    xpReward: 300,
    category: 'series',
    target: 5,
  },
  {
    id: 'animation_fan',
    name: 'Animation Fan',
    description: 'Watch 5 animation titles.',
    icon: 'color-palette-outline',
    xpReward: 300,
    category: 'series',
    target: 5,
  },
  // ── Social ────────────────────────────────────────────────────────────────────
  {
    id: 'first_comment',
    name: "Critic's Debut",
    description: 'Post your very first comment.',
    icon: 'chatbubble-outline',
    xpReward: 50,
    category: 'social',
    target: 1,
  },
  {
    id: 'comments_10',
    name: 'Film Critic',
    description: 'Post 10 comments.',
    icon: 'chatbubbles-outline',
    xpReward: 150,
    category: 'social',
    target: 10,
  },
  {
    id: 'comments_100',
    name: 'Master Critic',
    description: 'Post 100 comments — the voice of cinema.',
    icon: 'mic-outline',
    xpReward: 500,
    category: 'social',
    target: 100,
  },
  // ── Streaks ───────────────────────────────────────────────────────────────────
  {
    id: 'streak_7',
    name: 'Weekly Devotee',
    description: 'Log in 7 days in a row.',
    icon: 'flame-outline',
    xpReward: 200,
    category: 'streak',
    target: 7,
  },
  {
    id: 'streak_30',
    name: 'Monthly Legend',
    description: 'Log in 30 days in a row.',
    icon: 'flame',
    xpReward: 1000,
    category: 'streak',
    target: 30,
  },
  // ── XP Levels ─────────────────────────────────────────────────────────────────
  {
    id: 'level_10',
    name: 'Rising Star',
    description: 'Reach XP Level 10.',
    icon: 'star-half-outline',
    xpReward: 0,
    category: 'level',
    target: 10,
  },
  {
    id: 'level_25',
    name: 'Seasoned Viewer',
    description: 'Reach XP Level 25.',
    icon: 'star',
    xpReward: 0,
    category: 'level',
    target: 25,
  },
  {
    id: 'level_50',
    name: 'Elite',
    description: 'Reach XP Level 50.',
    icon: 'diamond-outline',
    xpReward: 0,
    category: 'level',
    target: 50,
  },
  {
    id: 'level_100',
    name: 'Master',
    description: 'Reach XP Level 100.',
    icon: 'ribbon-outline',
    xpReward: 0,
    category: 'level',
    target: 100,
  },
  {
    id: 'level_150',
    name: 'Grandmaster',
    description: 'Reach XP Level 150 — the pinnacle of cinema.',
    icon: 'crown',
    xpReward: 0,
    category: 'level',
    target: 150,
  },
];

/** Lookup map for quick access by ID */
export const ACHIEVEMENT_MAP = new Map(
  ACHIEVEMENTS.map(a => [a.id, a])
);

/** XP per level step */
export const XP_PER_LEVEL = 500;

/** Compute level from total XP (level starts at 1) */
export const xpToLevel = (xp: number): number =>
  Math.floor(xp / XP_PER_LEVEL) + 1;

/** XP needed to reach a given level */
export const levelToXP = (level: number): number =>
  (level - 1) * XP_PER_LEVEL;

/** XP progress within current level (0–1) */
export const xpLevelProgress = (xp: number): number => {
  const xpInLevel = xp % XP_PER_LEVEL;
  return xpInLevel / XP_PER_LEVEL;
};
