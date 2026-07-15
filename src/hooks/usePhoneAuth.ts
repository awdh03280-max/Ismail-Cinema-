/**
 * usePhoneAuth — Firebase Phone Sign-In hook (web).
 *
 * Manages the two-step phone auth flow:
 *   Step 1 "phone": user enters their number → sendCode() fires SMS
 *   Step 2 "otp":   user enters the OTP     → verifyCode() completes sign-in
 *
 * reCAPTCHA (invisible) is handled by AuthContext.sendPhoneCode via
 * Firebase's RecaptchaVerifier. The container element ID must be rendered
 * in the DOM before calling sendCode().
 */
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { ConfirmationResult } from 'firebase/auth';
import { useAuth, getAuthErrorMessage } from '../context/AuthContext';

export type PhoneAuthStep = 'idle' | 'phone' | 'otp';

export interface UsePhoneAuthResult {
  step: PhoneAuthStep;
  loading: boolean;
  error: string;
  open: () => void;
  close: () => void;
  sendCode: (phoneNumber: string) => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  resend: () => void;
}

const RECAPTCHA_CONTAINER_ID = 'phone-recaptcha-container';

const phoneErrorMessage = (code: string): string => {
  const map: Record<string, string> = {
    'auth/invalid-phone-number':
      'Invalid phone number. Include your country code, e.g. +1 555 000 1234.',
    'auth/missing-phone-number': 'Please enter your phone number.',
    'auth/quota-exceeded': 'SMS quota exceeded. Try again later.',
    'auth/captcha-check-failed': 'reCAPTCHA failed. Please try again.',
    'auth/invalid-verification-code':
      'Incorrect code. Please check and try again.',
    'auth/code-expired': 'Code expired. Request a new one.',
    'auth/missing-verification-code': 'Please enter the verification code.',
    'auth/too-many-requests':
      'Too many requests. Please wait a moment before retrying.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed':
      'Phone sign-in is not enabled. Enable it in Firebase Console → Auth → Sign-in method.',
    'auth/unauthorized-domain':
      'This domain is not authorised. Add it in Firebase Console → Auth → Authorized Domains.',
  };
  if (map[code]) return map[code];
  const general = getAuthErrorMessage(code);
  return general !== 'An unexpected error occurred. Please try again.'
    ? general
    : `Sign-in failed (${code || 'unknown'}). Please try again.`;
};

export function usePhoneAuth(options?: {
  onSuccess?: () => void;
}): UsePhoneAuthResult {
  const { sendPhoneCode, confirmPhoneOTP } = useAuth();
  const [step, setStep] = useState<PhoneAuthStep>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pendingPhone = useRef('');
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const open = useCallback(() => {
    setStep('phone');
    setError('');
    confirmationRef.current = null;
  }, []);

  const close = useCallback(() => {
    setStep('idle');
    setError('');
    confirmationRef.current = null;
    pendingPhone.current = '';
  }, []);

  const sendCode = useCallback(
    async (phoneNumber: string) => {
      if (Platform.OS !== 'web') {
        setError('Phone sign-in is only available on web in this version.');
        return;
      }
      setLoading(true);
      setError('');
      pendingPhone.current = phoneNumber;
      try {
        const result = await sendPhoneCode(phoneNumber, RECAPTCHA_CONTAINER_ID);
        confirmationRef.current = result;
        setStep('otp');
      } catch (err: any) {
        setError(phoneErrorMessage(err?.code ?? ''));
      } finally {
        setLoading(false);
      }
    },
    [sendPhoneCode],
  );

  const verifyCode = useCallback(
    async (code: string) => {
      if (!confirmationRef.current) {
        setError('Please request a code first.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        await confirmPhoneOTP(confirmationRef.current, code);
        close();
        options?.onSuccess?.();
      } catch (err: any) {
        setError(phoneErrorMessage(err?.code ?? ''));
      } finally {
        setLoading(false);
      }
    },
    [confirmPhoneOTP, close, options],
  );

  /** Go back to the phone-entry step and retry. */
  const resend = useCallback(() => {
    confirmationRef.current = null;
    setError('');
    setStep('phone');
  }, []);

  return { step, loading, error, open, close, sendCode, verifyCode, resend };
}
