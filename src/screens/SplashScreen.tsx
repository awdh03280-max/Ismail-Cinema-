/**
 * SplashScreen — cinematic brand intro for Ismail Cinema.
 *
 * Animation sequence (total ≈ 2.53 s):
 *   0 ms   – pure black screen
 *   80 ms  – red glow burst expands from centre
 *   250 ms – ambient halo settles behind logo
 *   300 ms – "ISMAIL" zooms in (scale 0.3 → 1.05 → 1.0) with red text glow
 *   680 ms – divider line fades in
 *   680 ms – "CINEMA" drifts up + fades in
 *   1 980 ms – exit: black overlay fades in (550 ms)
 *   2 530 ms – onComplete() fires
 *
 * All transform/opacity animations use useNativeDriver: true.
 * On Expo web, React Native's JS fallback handles them transparently.
 *
 * Sound: expo-av on native (cinema_startup.wav), Web Audio API on web.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

// ── Layout constants ──────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get('window');
const GLOW_R  = Math.min(W, H) * 0.85;   // outer burst ring diameter
const HALO_R  = GLOW_R * 0.55;            // inner ambient halo diameter
const LOGO_FS = Math.min(W * 0.20, 92);   // "ISMAIL" font size
const SUB_FS  = Math.min(W * 0.085, 36);  // "CINEMA" font size
const DIV_W   = Math.min(W * 0.38, 210);  // divider width

// ── Cinematic sound ───────────────────────────────────────────────────────────

/**
 * Plays the startup sound.
 * – Web  : programmatic synthesis via Web Audio API (no file required)
 * – Native: expo-av loads cinema_startup.wav from the asset bundle
 *
 * Returns a cleanup function that stops / unloads the sound.
 */
async function playCinematicSound(): Promise<() => void> {
  if (Platform.OS === 'web') {
    return playWebAudioTone();
  }
  return playNativeSound();
}

async function playNativeSound(): Promise<() => void> {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../assets/sounds/cinema_startup.wav'),
      { shouldPlay: true, volume: 0.85 },
    );
    return () => { sound.unloadAsync().catch(() => {}); };
  } catch {
    return () => {};
  }
}

function playWebAudioTone(): () => void {
  try {
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return () => {};

    const ctx = new AC();

    /** Creates one oscillator layer with an ADSR-style envelope. */
    const layer = (
      freq: number,
      type: OscillatorType,
      peak: number,
      startOff: number,
      dur: number,
    ) => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOff);
      // attack
      g.gain.setValueAtTime(0, ctx.currentTime + startOff);
      g.gain.linearRampToValueAtTime(peak, ctx.currentTime + startOff + 0.12);
      // sustain → release
      g.gain.setValueAtTime(peak * 0.85, ctx.currentTime + startOff + dur - 0.65);
      g.gain.linearRampToValueAtTime(0,   ctx.currentTime + startOff + dur);
      osc.start(ctx.currentTime + startOff);
      osc.stop(ctx.currentTime  + startOff + dur);
    };

    // Sub-bass boom (55 Hz)
    layer(55,   'sine',     0.42, 0,    2.7);
    // Bass octave (110 Hz)
    layer(110,  'sine',     0.16, 0,    2.7);
    // Mid warmth — enters at 0.35 s
    layer(220,  'sine',     0.09, 0.35, 2.2);
    // Shimmer — enters at 0.70 s
    layer(440,  'triangle', 0.022, 0.70, 1.8);
    // Air — enters at 0.95 s, barely audible
    layer(1760, 'sine',     0.007, 0.95, 1.5);

    const tid = setTimeout(() => { try { ctx.close(); } catch {} }, 3200);
    return () => { clearTimeout(tid); try { ctx.close(); } catch {} };
  } catch {
    return () => {};
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SplashScreenProps {
  /** Called when the exit fade completes — hands control back to RootNavigator. */
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const ND = { useNativeDriver: true } as const;

  // Glow burst: fast outward explosion then dissipates
  const burstScale   = useRef(new Animated.Value(0.1)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;

  // Ambient halo: settles to a steady red atmospheric glow
  const haloScale   = useRef(new Animated.Value(0.2)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;

  // "ISMAIL" logo: zoom-in with micro-overshoot
  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Divider line
  const divOpacity = useRef(new Animated.Value(0)).current;

  // "CINEMA" subtitle: drift up + fade
  const subY       = useRef(new Animated.Value(18)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;

  // Full-screen black exit overlay
  const exitOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setHidden(true);

    // ── Sound — guarded against unmount-before-resolve race ─────────────────
    // If the component unmounts while playCinematicSound() is still awaiting
    // (native expo-av asset load), we stop the sound the moment it arrives.
    let mounted = true;
    let stopSound: (() => void) | undefined;
    playCinematicSound().then(stop => {
      if (!mounted) { stop(); }   // late arrival — stop immediately
      else { stopSound = stop; }
    });

    const ease = Easing.out(Easing.cubic);

    // ── 1. Glow burst: expand rapidly then dissolve ───────────────────────────
    Animated.sequence([
      Animated.parallel([
        Animated.timing(burstOpacity, { toValue: 0.85, duration: 320, delay: 80,  useNativeDriver: true }),
        Animated.timing(burstScale,   { toValue: 1.7,  duration: 520, delay: 80, easing: ease, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(burstOpacity, { toValue: 0.12, duration: 500, useNativeDriver: true }),
        Animated.timing(burstScale,   { toValue: 2.6,  duration: 500, easing: Easing.linear, useNativeDriver: true }),
      ]),
    ]).start();

    // ── 2. Ambient halo: rise to steady atmospheric glow ─────────────────────
    Animated.parallel([
      Animated.timing(haloOpacity, { toValue: 0.52, duration: 750, delay: 240, easing: ease, ...ND }),
      Animated.timing(haloScale,   { toValue: 1.0,  duration: 750, delay: 240, easing: ease, ...ND }),
    ]).start();

    // ── 3. Logo zoom-in with slight spring overshoot ──────────────────────────
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1,    duration: 360, delay: 300, easing: ease, ...ND }),
        Animated.timing(logoScale,   { toValue: 1.06, duration: 480, delay: 300, easing: ease, ...ND }),
      ]),
      Animated.timing(logoScale,     { toValue: 1.0,  duration: 200, easing: Easing.inOut(Easing.quad), ...ND }),
    ]).start();

    // ── 4. Divider line ───────────────────────────────────────────────────────
    Animated.timing(divOpacity, { toValue: 0.75, duration: 380, delay: 680, easing: ease, ...ND }).start();

    // ── 5. "CINEMA" subtitle drift-up ─────────────────────────────────────────
    Animated.parallel([
      Animated.timing(subOpacity, { toValue: 1,  duration: 420, delay: 700, easing: ease, ...ND }),
      Animated.timing(subY,       { toValue: 0,  duration: 420, delay: 700, easing: ease, ...ND }),
    ]).start();

    // ── 6. Exit: fade to black, then hand off ─────────────────────────────────
    const exitTimer = setTimeout(() => {
      Animated.timing(exitOpacity, {
        toValue: 1,
        duration: 550,
        easing: Easing.in(Easing.quad),
        ...ND,
      }).start();
    }, 1980);

    const completeTimer = setTimeout(onComplete, 2530);

    return () => {
      mounted = false;
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
      stopSound?.();
    };
  }, [onComplete]); // onComplete is useCallback-stable from RootNavigator

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* ── Burst ring ── */}
      <Animated.View
        style={[
          styles.ring,
          styles.burstRing,
          { opacity: burstOpacity, transform: [{ scale: burstScale }] },
        ]}
      />

      {/* ── Ambient halo ── */}
      <Animated.View
        style={[
          styles.ring,
          styles.haloRing,
          { opacity: haloOpacity, transform: [{ scale: haloScale }] },
        ]}
      />

      {/* ── Vignette gradients (edges darker, adds cinematic depth) ── */}
      {/* No touch targets on splash — pointerEvents is unnecessary here */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.45)']}
        start={{ x: 0.5, y: 0.0 }}
        end={{ x: 0.5, y: 1.0 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.3)']}
        start={{ x: 0.0, y: 0.5 }}
        end={{ x: 1.0, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Logo group ── */}
      <Animated.View
        style={[
          styles.logoGroup,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        {/* "ISMAIL" — bold, red, glowing */}
        <Text style={styles.logoText} numberOfLines={1} adjustsFontSizeToFit>
          ISMAIL
        </Text>

        {/* Divider */}
        <Animated.View style={[styles.divider, { opacity: divOpacity }]} />

        {/* "CINEMA" — light, white, letter-spaced */}
        <Animated.View
          style={{ opacity: subOpacity, transform: [{ translateY: subY }] }}
        >
          <Text style={styles.subText} numberOfLines={1} adjustsFontSizeToFit>
            CINEMA
          </Text>
        </Animated.View>
      </Animated.View>

      {/* ── Exit overlay — fades screen to black ── */}
      {/* No pointerEvents needed: by the time opacity=1, onComplete() unmounts this */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.exitOverlay, { opacity: exitOpacity }]}
      />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Glow rings — animated via transform.scale + opacity only (native driver safe)
  ring: {
    position: 'absolute',
    borderRadius: 9999,
  },
  burstRing: {
    width: GLOW_R,
    height: GLOW_R,
    backgroundColor: 'rgba(229, 9, 20, 0.16)',
    // Static shadow — not animated, so native driver is fine for the View itself
    ...Platform.select({
      web: { boxShadow: '0 0 70px 20px rgba(229, 9, 20, 0.55)' } as object,
      default: {
        shadowColor: '#e50914',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 70,
        elevation: 0,
      },
    }),
  },
  haloRing: {
    width: HALO_R,
    height: HALO_R,
    backgroundColor: 'rgba(229, 9, 20, 0.24)',
    ...Platform.select({
      web: { boxShadow: '0 0 44px 12px rgba(229, 9, 20, 0.65)' } as object,
      default: {
        shadowColor: '#e50914',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 44,
        elevation: 0,
      },
    }),
  },

  // Logo
  logoGroup: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoText: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-black', default: 'System' }),
    fontSize: LOGO_FS,
    fontWeight: '900',
    color: '#e50914',
    letterSpacing: Math.max(4, W * 0.011),
    ...Platform.select({
      web: { textShadow: '0 0 28px rgba(229, 9, 20, 0.65)' } as object,
      default: {
        textShadowColor: 'rgba(229, 9, 20, 0.65)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 28,
      },
    }),
  },
  divider: {
    width: DIV_W,
    height: 1.5,
    backgroundColor: '#e50914',
    marginVertical: 14,
    ...Platform.select({
      web: { boxShadow: '0 0 10px 3px rgba(229, 9, 20, 0.7)' } as object,
      default: {
        shadowColor: '#e50914',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 10,
      },
    }),
  },
  subText: {
    fontSize: SUB_FS,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: Math.max(8, W * 0.017),
    opacity: 0.92,
  },

  // Full-screen black exit overlay
  exitOverlay: {
    backgroundColor: '#000000',
  },
});

export default SplashScreen;
