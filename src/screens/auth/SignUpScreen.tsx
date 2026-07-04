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
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import AuthInput from '../../components/auth/AuthInput';
import SocialButton from '../../components/auth/SocialButton';

// ── Validation ─────────────────────────────────────────────────────────────

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const isStrongPassword = (v: string) =>
  v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v);

// ── Component ──────────────────────────────────────────────────────────────

const SignUpScreen = ({ navigation }: any) => {
  const { signUp } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Cross-platform Google Sign-In (web=popup, native=expo-auth-session)
  const { trigger: googleSignIn, loading: googleLoading } = useGoogleAuth({
    onError: (err: any) => {
      const code: string = err?.code ?? '';
      if (code !== 'auth/popup-closed-by-user') {
        setApiError(getAuthErrorMessage(code));
      }
    },
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = 'Name is required.';
    else if (displayName.trim().length < 2) e.displayName = 'Name must be at least 2 characters.';
    else if (displayName.trim().length > 50) e.displayName = 'Name must be under 50 characters.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!isValidEmail(email)) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    else if (!isStrongPassword(password))
      e.password = 'Min 8 chars, 1 uppercase letter, 1 number.';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    setApiError('');
    if (!validate()) return;
    try {
      setLoading(true);
      await signUp(email.trim().toLowerCase(), password, displayName.trim());
      // Navigation handled declaratively by RootNavigator auth state
    } catch (err: any) {
      setApiError(getAuthErrorMessage(err.code ?? ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setApiError('');
    await googleSignIn();
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#aaa" />
            <Text style={styles.backText}>Sign In</Text>
          </TouchableOpacity>

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
            <Text style={styles.cardTitle}>Create account</Text>
            <Text style={styles.cardSubtitle}>Join Ismail Cinema today</Text>

            {!!apiError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#ff4d4d" />
                <Text style={styles.errorBannerText}>{apiError}</Text>
              </View>
            )}

            <AuthInput
              label="Display Name"
              icon="person-outline"
              value={displayName}
              onChangeText={t => { setDisplayName(t); setErrors(e => ({ ...e, displayName: '' })); }}
              autoCapitalize="words"
              placeholder="Your name"
              error={errors.displayName}
              returnKeyType="next"
            />

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
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              error={errors.password}
              returnKeyType="next"
            />

            <AuthInput
              label="Confirm Password"
              icon="lock-closed-outline"
              value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); setErrors(e => ({ ...e, confirmPassword: '' })); }}
              isPassword
              placeholder="Re-enter your password"
              error={errors.confirmPassword}
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />

            {/* Password hint */}
            <View style={styles.hint}>
              <Ionicons name="information-circle-outline" size={14} color="#555" />
              <Text style={styles.hintText}>
                At least 8 characters · 1 uppercase · 1 number
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleSignUp}
              disabled={loading || googleLoading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <SocialButton
              label="Sign up with Google"
              onPress={handleGoogle}
              loading={googleLoading}
              disabled={loading}
              icon={<Text style={styles.googleG}>G</Text>}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign In</Text>
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
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 },
  filmAccentTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#e50914' },
  filmAccentBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: '#e50914' },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText: { color: '#aaa', fontSize: 14 },

  brand: { alignItems: 'center', marginBottom: 28 },
  logoRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#e50914',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  logoTitle: { fontSize: 24, fontWeight: '900', color: '#e50914', letterSpacing: 3 },
  logoSub: { fontSize: 12, fontWeight: '300', color: '#aaa', letterSpacing: 5, marginTop: 2 },

  card: {
    backgroundColor: 'rgba(26,26,46,0.95)', borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: '#2a2a3e',
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#888', marginBottom: 24 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,77,77,0.12)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,77,77,0.3)',
    padding: 12, marginBottom: 16, gap: 8,
  },
  errorBannerText: { color: '#ff4d4d', fontSize: 13, flex: 1 },

  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, marginTop: -8 },
  hintText: { color: '#555', fontSize: 11 },

  primaryBtn: {
    backgroundColor: '#e50914', borderRadius: 10,
    height: 52, justifyContent: 'center', alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2a2a3e' },
  dividerText: { color: '#555', marginHorizontal: 12, fontSize: 13 },

  googleG: { fontSize: 18, fontWeight: '800', color: '#4285F4' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#888', fontSize: 14 },
  footerLink: { color: '#e50914', fontSize: 14, fontWeight: '700' },
});

export default SignUpScreen;
