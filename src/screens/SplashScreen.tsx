import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  /** Called when the splash animation finishes (≥3.5 s). */
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]).start();

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 1200,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Signal to RootNavigator that the animation is done.
    // RootNavigator will then show MainApp or AuthStack based on auth state.
    const timer = setTimeout(() => onComplete(), 3500);
    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, slideAnim, onComplete]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e27" />
      <LinearGradient
        colors={['#0a0e27', '#1a1a2e', '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          styles.titleContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={styles.titleText}>ISMAIL</Text>
        <Text style={styles.subtitleText}>CINEMA</Text>
      </Animated.View>
      <Animated.View
        style={[styles.bottomContent, { transform: [{ translateY: slideAnim }] }]}
      >
        <LinearGradient
          colors={['rgba(229, 9, 20, 0.3)', 'rgba(229, 9, 20, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBox}
        >
          <Text style={styles.tagline}>Your Premium Movie Experience</Text>
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
            <Animated.View style={[styles.dot, { opacity: Animated.add(fadeAnim, -0.5) }]} />
            <Animated.View style={[styles.dot, { opacity: Animated.subtract(1, fadeAnim) }]} />
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
  },
  titleContainer: { alignItems: 'center' },
  titleText: { fontSize: 56, fontWeight: '900', color: '#e50914', letterSpacing: 4 },
  subtitleText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 6,
    marginTop: 8,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 40,
    width: '80%',
    alignSelf: 'center',
  },
  gradientBox: { padding: 20, borderRadius: 12, alignItems: 'center' },
  tagline: { fontSize: 14, color: '#fff', marginBottom: 12 },
  dotsContainer: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e50914' },
});

export default SplashScreen;
