import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, getAuthErrorMessage } from '../../context/AuthContext';
import AuthInput from '../../components/auth/AuthInput';
import SocialButton from '../../components/auth/SocialButton';

// ── Validation ─────────────────────────────────────────────────────────────

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// ── Component ──────────────────────────────────────────────────────────────

const LoginScreen = ({ navigation }: any) => {
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!isValidEmail(email)) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    setApiError('');
    if (!validate()) return;
    try {
      setLoading(true);
      await signIn(email.trim().toLowerCase(), password);
      // Navigation handled declaratively by RootNavigator auth state
    } catch (err: any) {
      setApiError(getAuthErrorMessage(err.code ?? ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setApiError('');
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setApiError(getAuthErrorMessage(err.code ?? ''));
      }
    } finally {
      setGoogleLoading(false);
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

      {/* Decorative film-strip accent */}
      <View style={styles.filmAccentTop} />
      <View style={styles.filmAccentBottom} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoRing}>
              <Ionicons name="film" size={36} color="#e50914" />
            </View>
            <Text style={styles.logoTitle}>ISMAIL</Text>
            <Text style={styles.logoSub}>CINEMA</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your account</Text>

            {/* API-level error */}
            {!!apiError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#ff4d4d" />
                <Text style={styles.errorBannerText}>{apiError}</Text>
              </View>
            )}

            <AuthInput
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: '' })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="your@email.com"
              error={errors.email}
              returnKeyType="next"
            />

            <AuthInput
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
              isPassword
              placeholder="••••••••"
              error={errors.password}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {/* Forgot password */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotWrap}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign-in button */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google */}
            <SocialButton
              label="Continue with Google"
              onPress={handleGoogle}
              loading={googleLoading}
              icon={
                <Text style={styles.googleG}>G</Text>
              }
            />
          </View>

          {/* Sign up */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#0a0e27' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  // Film accent bars
  filmAccentTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
    backgroundColor: '#e50914',
  },
  filmAccentBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
    backgroundColor: '#e50914',
  },

  // Brand
  brand: { alignItems: 'center', marginBottom: 32 },
  logoRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#1a1a2e',
    borderWidth: 2, borderColor: '#e50914',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  logoTitle: { fontSize: 28, fontWeight: '900', color: '#e50914', letterSpacing: 3 },
  logoSub: { fontSize: 14, fontWeight: '300', color: '#aaa', letterSpacing: 5, marginTop: 2 },

  // Card
  card: {
    backgroundColor: 'rgba(26,26,46,0.95)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#888', marginBottom: 24 },

  // Error banner
  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,77,77,0.12)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,77,77,0.3)',
    padding: 12, marginBottom: 16, gap: 8,
  },
  errorBannerText: { color: '#ff4d4d', fontSize: 13, flex: 1 },

  // Forgot
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { color: '#e50914', fontSize: 13, fontWeight: '600' },

  // Primary button
  primaryBtn: {
    backgroundColor: '#e50914', borderRadius: 10,
    height: 52, justifyContent: 'center', alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2a2a3e' },
  dividerText: { color: '#555', marginHorizontal: 12, fontSize: 13 },

  // Google G
  googleG: { fontSize: 18, fontWeight: '800', color: '#4285F4' },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#888', fontSize: 14 },
  footerLink: { color: '#e50914', fontSize: 14, fontWeight: '700' },
});

export default LoginScreen;
