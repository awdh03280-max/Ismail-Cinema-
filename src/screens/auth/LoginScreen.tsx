import React, { useEffect, useState } from 'react';
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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth, getAuthErrorMessage } from '../../context/AuthContext';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import AuthInput from '../../components/auth/AuthInput';
import SocialButton from '../../components/auth/SocialButton';
import { isValidEmail } from '../../utils/validation';

const LoginScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { signIn, googleRedirectError, clearGoogleRedirectError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const { trigger: googleSignIn, loading: googleLoading } = useGoogleAuth({
    onError: (err: any) => {
      const code: string = err?.code ?? '';
      if (code === 'auth/popup-closed-by-user') return;
      if (code) {
        setApiError(getAuthErrorMessage(code));
      } else if (err?.message) {
        setApiError(err.message);
      } else {
        setApiError(t('auth_error_google_failed'));
      }
    },
  });

  useEffect(() => {
    if (!googleRedirectError) return;
    const code: string = (googleRedirectError as any)?.code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      clearGoogleRedirectError();
      return;
    }
    setApiError(code ? getAuthErrorMessage(code) : t('auth_error_google_failed'));
    clearGoogleRedirectError();
  }, [googleRedirectError, clearGoogleRedirectError]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = t('auth_error_email_required');
    else if (!isValidEmail(email)) e.email = t('auth_error_email_invalid');
    if (!password) e.password = t('auth_error_password_required');
    else if (password.length < 6) e.password = t('auth_error_password_short');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    setApiError('');
    if (!validate()) return;
    try {
      setLoading(true);
      await signIn(email.trim().toLowerCase(), password);
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
          {/* Brand */}
          <View style={styles.brand}>
            <Image
              source={require('../../../assets/branding/logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('auth_login_title')}</Text>
            <Text style={styles.cardSubtitle}>{t('auth_login_subtitle')}</Text>

            {!!apiError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#ff4d4d" />
                <Text style={styles.errorBannerText}>{apiError}</Text>
              </View>
            )}

            <AuthInput
              label={t('auth_email')}
              icon="mail-outline"
              value={email}
              onChangeText={(v: string) => { setEmail(v); setErrors(e => ({ ...e, email: '' })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="your@email.com"
              error={errors.email}
              returnKeyType="next"
            />

            <AuthInput
              label={t('auth_password')}
              icon="lock-closed-outline"
              value={password}
              onChangeText={(v: string) => { setPassword(v); setErrors(e => ({ ...e, password: '' })); }}
              isPassword
              placeholder="••••••••"
              error={errors.password}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotWrap}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>{t('auth_forgot_password')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleLogin}
              disabled={loading || googleLoading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{t('auth_sign_in')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth_or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <SocialButton
              label={t('auth_google')}
              onPress={handleGoogle}
              loading={googleLoading}
              disabled={loading}
              icon={<Text style={styles.googleG}>G</Text>}
            />
          </View>

          {/* Sign up */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth_no_account')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>{t('auth_sign_up')}</Text>
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
  filmAccentTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#e50914' },
  filmAccentBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: '#e50914' },
  brand: { alignItems: 'center', marginBottom: 32 },
  brandLogo: { width: 120, height: 120 },
  card: {
    backgroundColor: 'rgba(26,26,46,0.95)',
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,77,77,0.12)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,77,77,0.3)',
    padding: 12, marginBottom: 16, gap: 8,
  },
  errorBannerText: { color: '#ff4d4d', fontSize: 13, flex: 1 },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { color: '#e50914', fontSize: 13, fontWeight: '600' },
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

export default LoginScreen;
