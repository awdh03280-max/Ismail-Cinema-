import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, getAuthErrorMessage } from '../../context/AuthContext';
import AuthInput from '../../components/auth/AuthInput';

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const ForgotPasswordScreen = ({ navigation }: any) => {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [sent, setSent] = useState(false);

  const validate = (): boolean => {
    if (!email.trim()) { setEmailError('Email is required.'); return false; }
    if (!isValidEmail(email)) { setEmailError('Enter a valid email address.'); return false; }
    setEmailError('');
    return true;
  };

  const handleReset = async () => {
    setApiError('');
    if (!validate()) return;
    try {
      setLoading(true);
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: any) {
      setApiError(getAuthErrorMessage(err.code ?? ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e27" />
      <LinearGradient
        colors={['#0a0e27', '#1a1a2e', '#0a0e27']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.filmAccentTop} />
      <View style={styles.filmAccentBottom} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#aaa" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={40} color="#e50914" />
          </View>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a link to reset your password.
          </Text>

          {/* Success state */}
          {sent ? (
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={48} color="#2db52d" style={styles.successIcon} />
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successText}>
                We've sent a password reset link to{'\n'}
                <Text style={styles.successEmail}>{email}</Text>
              </Text>
              <Text style={styles.successNote}>
                Check your inbox and spam folder. The link expires in 1 hour.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              {!!apiError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#ff4d4d" />
                  <Text style={styles.errorBannerText}>{apiError}</Text>
                </View>
              )}

              <AuthInput
                label="Email Address"
                icon="mail-outline"
                value={email}
                onChangeText={t => { setEmail(t); setEmailError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="your@email.com"
                error={emailError}
                returnKeyType="done"
                onSubmitEditing={handleReset}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#0a0e27' },
  inner: { flex: 1, paddingHorizontal: 24, paddingVertical: 40, justifyContent: 'center' },
  filmAccentTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#e50914' },
  filmAccentBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: '#e50914' },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 },
  backText: { color: '#aaa', fontSize: 14 },

  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#e50914',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 21 },

  card: {
    backgroundColor: 'rgba(26,26,46,0.95)', borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: '#2a2a3e',
  },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,77,77,0.12)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,77,77,0.3)',
    padding: 12, marginBottom: 16, gap: 8,
  },
  errorBannerText: { color: '#ff4d4d', fontSize: 13, flex: 1 },

  primaryBtn: {
    backgroundColor: '#e50914', borderRadius: 10,
    height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  cancelBtn: { marginTop: 16, alignItems: 'center' },
  cancelText: { color: '#666', fontSize: 14 },

  // Success
  successCard: {
    backgroundColor: 'rgba(26,26,46,0.95)', borderRadius: 20,
    padding: 28, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center',
  },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12 },
  successText: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  successEmail: { color: '#fff', fontWeight: '700' },
  successNote: { fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 24, lineHeight: 18 },
});

export default ForgotPasswordScreen;
