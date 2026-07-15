/**
 * PhoneAuthModal — two-step phone authentication overlay.
 *
 * Step 1: user enters phone number (with country code).
 * Step 2: user enters the 6-digit OTP from SMS.
 *
 * An invisible reCAPTCHA container is rendered inside the modal so Firebase
 * can resolve the element ID before sendCode() is called.
 *
 * UI deliberately matches the existing SocialButton / card design language.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UsePhoneAuthResult } from '../../hooks/usePhoneAuth';

interface Props {
  phoneAuth: UsePhoneAuthResult;
}

const PhoneAuthModal: React.FC<Props> = ({ phoneAuth }) => {
  const { step, loading, error, close, sendCode, verifyCode, resend } =
    phoneAuth;
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const otpRef = useRef<TextInput>(null);

  const isVisible = step === 'phone' || step === 'otp';

  // Clear inputs when modal closes or step changes
  useEffect(() => {
    if (step === 'idle') {
      setPhone('');
      setOtp('');
    }
    if (step === 'otp') {
      setOtp('');
      setTimeout(() => otpRef.current?.focus(), 150);
    }
  }, [step]);

  const handleSend = () => {
    const raw = phone.trim();
    if (!raw) return;
    // Prepend '+' if the user omitted it
    const normalised = raw.startsWith('+') ? raw : `+${raw}`;
    sendCode(normalised);
  };

  const handleVerify = () => {
    const cleaned = otp.trim();
    if (cleaned.length < 4) return;
    verifyCode(cleaned);
  };

  const handleClose = () => {
    setPhone('');
    setOtp('');
    close();
  };

  const handleResend = () => {
    setOtp('');
    resend();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/*
        Invisible reCAPTCHA container.
        On web, <View nativeID="..."> renders as <div id="...">.
        Firebase's RecaptchaVerifier looks it up by this ID.
        It must exist in the DOM before sendPhoneCode() is called.
      */}
      {Platform.OS === 'web' && (
        <View nativeID="phone-recaptcha-container" style={styles.recaptcha} />
      )}

      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 'phone'
                ? 'Enter your phone number'
                : 'Enter verification code'}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color="#aaa" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            {step === 'phone'
              ? "We\u2019ll send a one-time code to this number"
              : 'Check your SMS and enter the 6-digit code'}
          </Text>

          {/* ── Error banner ── */}
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color="#ff4d4d" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Step 1: phone number ── */}
          {step === 'phone' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="+1 555 000 1234"
                placeholderTextColor="#555"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoFocus
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[
                  styles.btn,
                  (!phone.trim() || loading) && styles.btnDisabled,
                ]}
                onPress={handleSend}
                disabled={!phone.trim() || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>Send Code</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <>
              <TextInput
                ref={otpRef}
                style={[styles.input, styles.otpInput]}
                placeholder="123456"
                placeholderTextColor="#555"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
              />
              <TouchableOpacity
                style={[
                  styles.btn,
                  (!otp.trim() || loading) && styles.btnDisabled,
                ]}
                onPress={handleVerify}
                disabled={!otp.trim() || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>Verify & Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendLink}
                onPress={handleResend}
                disabled={loading}
              >
                <Text style={styles.resendText}>
                  Didn\u2019t receive a code? Go back
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  /** Zero-size element; just needs to exist in the DOM for reCAPTCHA. */
  recaptcha: { width: 0, height: 0, overflow: 'hidden' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#141414',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  subtitle: { color: '#888', fontSize: 13, marginBottom: 20 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,77,77,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,77,77,0.3)',
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { color: '#ff4d4d', fontSize: 13, flex: 1 },

  input: {
    borderWidth: 1,
    borderColor: '#2a2a3e',
    borderRadius: 10,
    height: 52,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 17,
    backgroundColor: '#0d0d1a',
    marginBottom: 16,
  },
  otpInput: {
    letterSpacing: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },

  btn: {
    backgroundColor: '#e50914',
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  resendLink: { alignItems: 'center', marginTop: 18 },
  resendText: { color: '#d4af37', fontSize: 13, fontWeight: '600' },
});

export default PhoneAuthModal;
