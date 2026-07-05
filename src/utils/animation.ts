/**
 * animation.ts — cross-platform animation helpers.
 *
 * React Native Web does not support the native animation driver, so every
 * Animated call that passes `useNativeDriver: true` prints a warning on web.
 * Use `ND` instead of a hardcoded `true` / `false` to silence the warning.
 */
import { Platform } from 'react-native';

/** `true` on native (iOS/Android), `false` on web. Drop into `useNativeDriver`. */
export const ND = Platform.OS !== 'web';
