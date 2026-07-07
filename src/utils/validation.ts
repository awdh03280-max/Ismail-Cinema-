/**
 * Shared validation utilities.
 */

/** Basic email format check — same regex used across all auth screens. */
export const isValidEmail = (v: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
