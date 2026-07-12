/**
 * AuthGate — wraps screens that require a signed-in user.
 *
 * Used for the "protected" features (Favorites, Watch Party, Followers/
 * Following, Notifications). Browsing (Home/Search/MovieDetails/Player)
 * stays open to guests — those screens are NOT wrapped in this gate.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface AuthGateProps {
  navigation: any;
  children: React.ReactNode;
  /** Shown under the lock icon — describe what signing in unlocks. */
  message?: string;
}

const AuthGate: React.FC<AuthGateProps> = ({ navigation, children, message }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#d4af37" size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.iconRing}>
          <Ionicons name="lock-closed" size={32} color="#d4af37" />
        </View>
        <Text style={styles.title}>Sign in required</Text>
        <Text style={styles.subtitle}>
          {message ?? 'Sign in to use this feature.'}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1a1000',
    borderWidth: 2,
    borderColor: '#d4af37',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 24 },
  button: {
    backgroundColor: '#e50914',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default AuthGate;
