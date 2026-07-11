/**
 * Firebase initialization — cross-platform (web + React Native).
 *
 * Auth persistence:
 *   Web    → browserLocalPersistence  (Firebase default on web)
 *   Native → getReactNativePersistence(AsyncStorage)
 *
 * We call getApps() guard so Hot Reload never double-initialises.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Firebase config values are sourced from env vars when available, but fall
// back to the hardcoded values derived from google-services.json.  This
// prevents an immediate crash on native builds where EXPO_PUBLIC_FIREBASE_*
// vars were not explicitly set in the EAS environment.
const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
    'AIzaSyB_XkpnBFDomDGS8-SAcNCPzzODox4TBks',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    'ismail-cinema.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'ismail-cinema',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    'ismail-cinema.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '523983300969',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??
    '1:523983300969:android:ff4116b7c9e618a306b5f8',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Auth — platform-aware persistence ────────────────────────────────────────
import type { Auth } from 'firebase/auth';

let _auth: Auth;

if (Platform.OS === 'web') {
  // Web: Firebase JS SDK defaults to browserLocalPersistence — nothing extra needed.
  const { getAuth } = require('firebase/auth');
  _auth = getAuth(app);
} else {
  // Native: persist across app restarts via AsyncStorage.
  const { initializeAuth, getAuth, getReactNativePersistence } =
    require('firebase/auth');
  const AsyncStorage =
    require('@react-native-async-storage/async-storage').default;

  try {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if already called — fall back to getAuth
    _auth = getAuth(app);
  }
}

export const auth: Auth = _auth;

/** Firestore database instance. */
export const db = getFirestore(app);

export default app;
