/**
 * ProfileSignInPrompt — shown inside the Profile tab when no user is signed in.
 *
 * Per product requirement, browsing (Home/Search/Details/Player) never
 * requires auth. Authentication only happens here, from the Profile tab.
 *
 * Google Sign-In is fully wired to existing Firebase auth logic. Facebook
 * and Phone Number are presented as options but are not yet configured on
 * the Firebase project (no Facebook App ID / phone provider enabled) — they
 * show an informational alert instead of failing silently.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, getAuthErrorMessage } from '../context/AuthContext';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import SocialButton from '../components/auth/SocialButton';

const ProfileSignInPrompt = ({ navigation }: any) => {
  const { googleRedirectError, clearGoogleRedirectError } = useAuth();
  const [apiError, setApiError] = useState('');

  const { trigger: googleSignIn, loading: googleLoading } = useGoogleAuth({
    onError: (err: any) => {
      const code: string = err?.code ?? '';
      if (code === 'auth/popup-closed-by-user') return;
      setApiError(code ? getAuthErrorMessage(code) : (err?.message || 'Google Sign-In failed. Please try again.'));
    },
  });

  useEffect(() => {
    if (!googleRedirectError) return;
    const code: string = (googleRedirectError as any)?.code ?? '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      clearGoogleRedirectError();
      return;
    }
    setApiError(code ? getAuthErrorMessage(code) : 'Google Sign-In failed. Please try again.');
    clearGoogleRedirectError();
  }, [googleRedirectError, clearGoogleRedirectError]);

  const handleGoogle = async () => {
    setApiError('');
    await googleSignIn();
  };

  const handleFacebook = () => {
    Alert.alert(
      'Facebook Sign-In',
      'Facebook sign-in isn\u2019t configured for this app yet. Add a Facebook App ID in the Firebase console to enable it.'
    );
  };

  const handlePhone = () => {
    Alert.alert(
      'Phone Sign-In',
      'Phone number sign-in isn\u2019t configured for this app yet. Enable the Phone provider in the Firebase console to turn it on.'
    );
  };

  const handleGuest = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <LinearGradient
        colors={['#000000', '#0d0d0d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Image
            source={require('../../assets/branding/logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in to your profile</Text>
          <Text style={styles.cardSubtitle}>
            Unlock favorites, watch parties, friends & notifications
          </Text>

          {!!apiError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#ff4d4d" />
              <Text style={styles.errorBannerText}>{apiError}</Text>
            </View>
          )}

          <SocialButton
            label="Continue with Google"
            onPress={handleGoogle}
            loading={googleLoading}
            icon={<Text style={styles.googleG}>G</Text>}
          />
          <View style={styles.gap} />
          <SocialButton
            label="Continue with Facebook"
            onPress={handleFacebook}
            icon={<Ionicons name="logo-facebook" size={18} color="#4267B2" />}
          />
          <View style={styles.gap} />
          <SocialButton
            label="Continue with Phone Number"
            onPress={handlePhone}
            icon={<Ionicons name="call" size={18} color="#d4af37" />}
          />

          <TouchableOpacity
            style={styles.emailLink}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.emailLinkText}>Sign in with email instead</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleGuest} activeOpacity={0.7} style={styles.guestLink}>
            <Text style={styles.guestLinkText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  brand: { alignItems: 'center', marginBottom: 32 },
  brandLogo: { width: 120, height: 120 },

  card: {
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4, textAlign: 'center' },
  cardSubtitle: { fontSize: 13, color: '#999', marginBottom: 24, textAlign: 'center' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,77,77,0.12)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,77,77,0.3)',
    padding: 12, marginBottom: 16, gap: 8,
  },
  errorBannerText: { color: '#ff4d4d', fontSize: 13, flex: 1 },

  gap: { height: 12 },
  googleG: { fontSize: 18, fontWeight: '800', color: '#4285F4' },

  emailLink: { alignItems: 'center', marginTop: 20 },
  emailLinkText: { color: '#d4af37', fontSize: 13, fontWeight: '600' },

  guestLink: { alignItems: 'center', marginTop: 16 },
  guestLinkText: { color: '#666', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#888', fontSize: 14 },
  footerLink: { color: '#e50914', fontSize: 14, fontWeight: '700' },
});

export default ProfileSignInPrompt;
