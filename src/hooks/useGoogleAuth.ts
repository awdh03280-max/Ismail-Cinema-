/**
 * useGoogleAuth — cross-platform Google Sign-In hook.
 *
 * Web    → Firebase signInWithPopup (no extra config needed)
 * Native → expo-auth-session OAuth flow → Firebase signInWithCredential
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

// Required on Android — closes the in-app browser tab after OAuth redirect.
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

  // Stable ref so effects don't re-run when the callback identity changes.
  const onErrorRef = useRef<((err: unknown) => void) | undefined>(
    options?.onError,
  );
  useEffect(() => {
    onErrorRef.current = options?.onError;
  });

  // expo-auth-session Google provider — requests an ID token (OpenID Connect).
  // webClientId is the OAuth 2.0 Web Client ID from Firebase Console →
  // Authentication → Sign-in method → Google → Web SDK configuration.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  // Handle the OAuth response that arrives after the browser redirect.
  useEffect(() => {
    if (!response) return;

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
    // 'cancel' or 'dismiss' — user closed browser; clear loading silently.
    setLoading(false);
  }, [response, signInWithGoogleCredential]);

  const trigger = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web: Firebase popup flow — fully awaitable.
        await signInWithGoogle();
        setLoading(false);
      } else {
        // Native: open system browser / Chrome Custom Tab / SFSafariViewController.
        // promptAsync() resolves when the browser opens or closes, but the
        // actual auth result arrives via `response` state → handled in useEffect.
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
