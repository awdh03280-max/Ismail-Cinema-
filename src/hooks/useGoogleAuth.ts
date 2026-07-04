/**
 * useGoogleAuth — cross-platform Google Sign-In hook.
 *
 * Web    → Firebase signInWithPopup (no extra config needed)
 * Native → expo-auth-session OAuth flow → Firebase signInWithCredential
 *
 * Client ID resolution (native):
 *   1. EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID / EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
 *      (production: create separate OAuth apps in Google Cloud Console)
 *   2. Falls back to EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID so the flow works in
 *      Expo Go (which routes through the Expo auth proxy).
 *
 * Usage:
 *   const { trigger, loading } = useGoogleAuth({ onError: (err) => ... });
 *   <Button onPress={trigger} loading={loading} />
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';

// Required on Android — dismisses the in-app browser tab after OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

export interface UseGoogleAuthOptions {
  onError?: (err: unknown) => void;
}

export interface UseGoogleAuthResult {
  trigger: () => Promise<void>;
  loading: boolean;
}

export function useGoogleAuth(
  options?: UseGoogleAuthOptions,
): UseGoogleAuthResult {
  const { signInWithGoogle, signInWithGoogleCredential } = useAuth();
  const [loading, setLoading] = useState(false);

  // Prevent duplicate processing if the response effect fires more than once.
  const handledRef = useRef(false);

  // Stable ref so the effect below doesn't re-run when the callback identity changes.
  const onErrorRef = useRef<((err: unknown) => void) | undefined>(
    options?.onError,
  );
  useEffect(() => {
    onErrorRef.current = options?.onError;
  });

  // Resolve platform-specific client IDs.
  // For production standalone builds supply separate Android/iOS OAuth app IDs.
  // Expo Go works with webClientId via the Expo auth proxy.
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const androidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? webClientId;
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? webClientId;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId,
    androidClientId,
    iosClientId,
  });

  // Handle the OAuth response that arrives after the browser redirect.
  useEffect(() => {
    if (!response) return;
    // Guard against duplicate processing (e.g. stale re-renders).
    if (handledRef.current) return;
    handledRef.current = true;

    if (response.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        signInWithGoogleCredential(idToken)
          .catch((err: unknown) => onErrorRef.current?.(err))
          .finally(() => setLoading(false));
        return; // loading cleared in finally above
      }
      onErrorRef.current?.(
        new Error('Google Sign-In did not return an ID token.'),
      );
    } else if (response.type === 'error') {
      onErrorRef.current?.(
        response.error ?? new Error('Google Sign-In failed.'),
      );
    }
    // 'cancel' or 'dismiss' — user closed the browser; clear loading silently.
    setLoading(false);
  }, [response, signInWithGoogleCredential]);

  const trigger = useCallback(async (): Promise<void> => {
    // Reset duplicate-guard for this new attempt.
    handledRef.current = false;
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web: Firebase popup flow — fully awaitable.
        await signInWithGoogle();
        setLoading(false);
      } else {
        // Native: opens system browser / Chrome Custom Tab / SFSafariViewController.
        // promptAsync resolves when the browser opens or closes, but the auth
        // result comes back through `response` state — handled in the useEffect above.
        if (!request) {
          setLoading(false);
          onErrorRef.current?.(
            new Error(
              'Google Sign-In is initialising — please try again in a moment.',
            ),
          );
          return;
        }
        await promptAsync();
        // Loading stays true until useEffect processes the response.
      }
    } catch (err: unknown) {
      setLoading(false);
      onErrorRef.current?.(err);
    }
  }, [signInWithGoogle, request, promptAsync]);

  return { trigger, loading };
}
