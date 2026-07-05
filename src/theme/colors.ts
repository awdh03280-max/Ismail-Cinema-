/**
 * Ismail Cinema — premium cinematic color palette.
 *
 * Usage: import { colors } from '../theme/colors';
 * Kept centralized so the black/gold/red identity stays consistent
 * across every screen without touching Player / Family Mode / Auth logic.
 */

export const colors = {
  // Core surfaces
  black: '#000000',
  background: '#000000',
  surface: '#0d0d0d',
  surfaceElevated: '#161616',
  surfaceCard: '#141414',
  border: 'rgba(212, 175, 55, 0.16)',

  // Gold accents
  gold: '#d4af37',
  goldBright: '#f4d675',
  goldMuted: 'rgba(212, 175, 55, 0.35)',
  goldGlow: 'rgba(212, 175, 55, 0.55)',

  // Red — reserved for important actions (Play)
  red: '#e50914',
  redBright: '#ff1a25',
  redGlow: 'rgba(229, 9, 20, 0.55)',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#b8b8b8',
  textMuted: '#767676',

  // Utility
  overlay: 'rgba(0,0,0,0.55)',
  overlayStrong: 'rgba(0,0,0,0.85)',
} as const;

export const gradients = {
  screen: ['#000000', '#0a0a0a', '#000000'] as const,
  heroFade: ['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.92)', '#000000'] as const,
  cardShine: ['transparent', 'rgba(0,0,0,0.85)'] as const,
  goldSheen: ['transparent', 'rgba(212,175,55,0.25)', 'transparent'] as const,
};
