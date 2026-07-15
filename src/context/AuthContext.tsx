/**
 * AuthContext — global Firebase Auth state for Ismail Cinema.
 *
 * Provides:
 *  - user          Firebase User | null (null while loading OR logged out)
 *  - userProfile   Firestore profile document
 *  - isLoading     true until onAuthStateChanged fires for the first time
 *  - signUp / signIn / signInWithGoogle / forgotPassword / logout
 *
 * isLoading guards route decisions in RootNavigator — never route until false.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Platform } from 'react-native';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { Timestamp, FieldValue } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  provider: 'email' | 'google' | 'phone';
  createdAt: Timestamp | FieldValue | null;
  updatedAt: Timestamp | FieldValue | null;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleCredential: (idToken: string) => Promise<void>;
  /** Web-only: send SMS verification code. Returns ConfirmationResult. */
  sendPhoneCode: (phoneNumber: string, containerId: string) => Promise<ConfirmationResult>;
  /** Confirm the OTP from the SMS and complete phone sign-in. */
  confirmPhoneOTP: (confirmation: ConfirmationResult, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Populated if a signInWithRedirect-based Google sign-in completes with an error. */
  googleRedirectError: unknown | null;
  clearGoogleRedirectError: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map Firebase error codes to human-readable messages. */
export const getAuthErrorMessage = (code: string): string => {
  const map: Record<string, string> = {
    'auth/email-already-in-use':
      'An account with this email already exists.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests':
      'Too many attempts. Please wait and try again.',
    'auth/network-request-failed':
      'Network error. Check your connection.',
    'auth/popup-blocked':
      'Popup blocked. Please allow popups for Google Sign-In.',
    'auth/popup-closed-by-user': 'Google Sign-In was cancelled.',
    'auth/unauthorized-domain':
      'This domain is not authorised. Add it in Firebase Console → Auth → Settings → Authorized Domains.',
    'auth/operation-not-allowed':
      'This sign-in method is not enabled. Enable it in Firebase Console.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/account-exists-with-different-credential':
      'An account already exists with the same email using a different sign-in method.',
  };
  return map[code] ?? 'An unexpected error occurred. Please try again.';
};

/**
 * Derive the canonical provider string from Firebase Auth providerData.
 * Falls back to the explicit override (needed during signUp before providerData is set).
 */
const deriveProvider = (
  user: FirebaseUser,
  override?: 'email' | 'google' | 'phone'
): 'email' | 'google' | 'phone' => {
  if (override) return override;
  const pid = user.providerData?.[0]?.providerId ?? '';
  if (pid === 'google.com') return 'google';
  if (pid === 'phone') return 'phone';
  return 'email';
};

/** Create or merge Firestore user profile after any sign-in. */
const ensureUserProfile = async (
  user: FirebaseUser,
  providerOverride?: 'email' | 'google' | 'phone',
  displayName?: string
): Promise<UserProfile> => {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const provider = deriveProvider(user, providerOverride);

  if (!snap.exists()) {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email ?? '',
      displayName: displayName ?? user.displayName ?? 'Cinema User',
      photoURL: user.photoURL ?? null,
      provider,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, profile);
    return profile;
  }

  // Merge: always correct provider, displayName, photoURL, email on every login
  const updated = {
    email: user.email ?? snap.data().email,
    displayName: displayName ?? user.displayName ?? snap.data().displayName,
    photoURL: user.photoURL ?? snap.data().photoURL,
    provider,                         // heal any previous wrong value
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, updated, { merge: true });
  return { ...(snap.data() as UserProfile), ...updated };
};

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleRedirectError, setGoogleRedirectError] = useState<unknown | null>(null);

  const clearGoogleRedirectError = useCallback(() => setGoogleRedirectError(null), []);

  // ── Complete a Google sign-in that fell back to signInWithRedirect ─────────
  // (e.g. when the popup was blocked). Firebase resolves this once, on the
  // first load after the OAuth provider redirects back to this page.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    getRedirectResult(auth)
      .then(async result => {
        if (!result) return; // no pending redirect sign-in
        const profile = await ensureUserProfile(result.user, 'google');
        setUserProfile(profile);
      })
      .catch(err => setGoogleRedirectError(err));
  }, []);

  // ── Persistent session restore ─────────────────────────────────────────────
  useEffect(() => {
    // Safety net: if Firebase never calls onAuthStateChanged (e.g. network issues
    // on first load), unblock the splash screen after 8 seconds.
    const fallbackTimer = setTimeout(() => {
      setIsLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async fbUser => {
      clearTimeout(fallbackTimer);
      setUser(fbUser);
      if (fbUser) {
        try {
          const ref = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          } else {
            // Profile may be missing (e.g. first Google login before Firestore write)
            // Derive provider from Firebase Auth providerData — no hardcoded override
          const profile = await ensureUserProfile(fbUser);
            setUserProfile(profile);
          }
        } catch {
          // Firestore unavailable — set minimal profile from Firebase Auth
          setUserProfile({
            uid: fbUser.uid,
            email: fbUser.email ?? '',
            displayName: fbUser.displayName ?? 'Cinema User',
            photoURL: fbUser.photoURL ?? null,
            provider: deriveProvider(fbUser),
            createdAt: null,
            updatedAt: null,
          });
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  // ── Email / Password Sign Up ───────────────────────────────────────────────
  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<void> => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await updateProfile(credential.user, { displayName });
    const profile = await ensureUserProfile(
      credential.user,
      'email',
      displayName
    );
    setUserProfile(profile);
  };

  // ── Email / Password Sign In ───────────────────────────────────────────────
  const signIn = async (email: string, password: string): Promise<void> => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await ensureUserProfile(credential.user, 'email');
    setUserProfile(profile);
  };

  // ── Google Sign-In (web: signInWithPopup, falls back to redirect) ─────────
  // Errors that mean "the popup mechanism itself didn't work" (as opposed to
  // the user cancelling) — retry with a full-page redirect instead. This
  // covers browsers/environments (e.g. embedded preview iframes, strict
  // popup blockers) where window.open() is blocked or the popup can't
  // communicate back to the opener.
  const POPUP_FALLBACK_CODES = new Set([
    'auth/popup-blocked',
    'auth/operation-not-supported-in-this-environment',
    'auth/web-storage-unsupported',
  ]);

  const signInWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    // Always show the account chooser instead of silently reusing the
    // last signed-in Google session — otherwise the picker can be skipped.
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const profile = await ensureUserProfile(result.user, 'google');
      setUserProfile(profile);
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (POPUP_FALLBACK_CODES.has(code)) {
        // Full-page redirect flow — the page navigates away and back;
        // completion is handled by the getRedirectResult() effect above.
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  };

  // ── Google Sign-In (native: called by useGoogleAuth hook with ID token) ───
  const signInWithGoogleCredential = useCallback(
    async (idToken: string): Promise<void> => {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const profile = await ensureUserProfile(result.user, 'google');
      setUserProfile(profile);
    },
    [], // auth and db are module-level singletons; no reactive dependencies needed
  );

  // ── Phone Sign-In Step 1: send SMS code (web only) ────────────────────────
  // RecaptchaVerifier is module-scoped so it survives across re-renders and
  // can be cleared on error without recreating the whole provider instance.
  const sendPhoneCode = useCallback(
    async (phoneNumber: string, containerId: string): Promise<ConfirmationResult> => {
      // Clear any stale verifier so we always start fresh per call.
      if ((auth as any)._recaptchaVerifier) {
        try { (auth as any)._recaptchaVerifier.clear(); } catch {}
        (auth as any)._recaptchaVerifier = null;
      }
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {},
      });
      (auth as any)._recaptchaVerifier = verifier;
      try {
        const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        return result;
      } catch (err) {
        try { verifier.clear(); } catch {}
        (auth as any)._recaptchaVerifier = null;
        throw err;
      }
    },
    [],
  );

  // ── Phone Sign-In Step 2: confirm OTP ─────────────────────────────────────
  const confirmPhoneOTP = useCallback(
    async (confirmation: ConfirmationResult, code: string): Promise<void> => {
      const result = await confirmation.confirm(code);
      const profile = await ensureUserProfile(result.user, 'phone');
      setUserProfile(profile);
    },
    [],
  );

  // ── Forgot Password ────────────────────────────────────────────────────────
  const forgotPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    await signOut(auth);
    setUserProfile(null);
  };

  // ── Refresh profile from Firestore ─────────────────────────────────────────
  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setUserProfile(snap.data() as UserProfile);
    } catch {}
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        googleRedirectError,
        clearGoogleRedirectError,
        user,
        userProfile,
        isLoading,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithGoogleCredential,
        sendPhoneCode,
        confirmPhoneOTP,
        forgotPassword,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
