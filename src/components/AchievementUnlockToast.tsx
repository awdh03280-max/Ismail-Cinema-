/**
 * AchievementUnlockToast — animated overlay shown when an achievement unlocks.
 *
 * Slides down from the top with a gold shimmer, auto-dismisses after 3.5 s.
 * Driven by XPContext's pendingUnlocks queue — shows one at a time.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useXP } from '../context/XPContext';
import { colors } from '../theme/colors';

const TOAST_DURATION = 3500;

const AchievementUnlockToast: React.FC = () => {
  const { pendingUnlocks, dismissUnlock } = useXP();
  const current = pendingUnlocks[0] ?? null;

  const slideAnim = useRef(new Animated.Value(-140)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const shimmerLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!current) {
      // Slide out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -140,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
      return;
    }

    if (activeIdRef.current === current.achievement.id) return;
    activeIdRef.current = current.achievement.id;

    // Reset position then slide in
    slideAnim.setValue(-140);
    opacityAnim.setValue(0);
    scaleAnim.setValue(0.9);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: false,
      }),
    ]).start();

    // Shimmer loop — store reference so we can stop it on cleanup
    shimmerAnim.setValue(0);
    shimmerLoopRef.current = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: false,
      })
    );
    shimmerLoopRef.current.start();

    // Auto-dismiss
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      activeIdRef.current = null;
      dismiss();
    }, TOAST_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      shimmerLoopRef.current?.stop();
    };
  }, [current?.achievement.id]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -140,
        duration: 280,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start(() => {
      activeIdRef.current = null;
      dismissUnlock();
    });
  };

  if (!current) return null;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const TOP_OFFSET = Platform.OS === 'ios' ? 54 : 36;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top: TOP_OFFSET },
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity activeOpacity={0.9} onPress={dismiss} style={styles.touchable}>
        <LinearGradient
          colors={['#1a1400', '#0d0d0d', '#1a0900']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Gold border glow */}
          <View style={styles.goldBorder} />

          {/* Shimmer sweep */}
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerTranslate }] },
            ]}
            pointerEvents="none"
          />

          <View style={styles.content}>
            {/* Icon circle */}
            <View style={styles.iconCircle}>
              <LinearGradient
                colors={[colors.gold, '#a07c1a']}
                style={styles.iconGradient}
              >
                <Ionicons
                  name={current.achievement.icon as any}
                  size={26}
                  color="#000"
                />
              </LinearGradient>
            </View>

            {/* Text */}
            <View style={styles.textBlock}>
              <Text style={styles.unlockLabel}>🏆 Achievement Unlocked!</Text>
              <Text style={styles.achievementName} numberOfLines={1}>
                {current.achievement.name}
              </Text>
              <Text style={styles.achievementDesc} numberOfLines={1}>
                {current.achievement.description}
              </Text>
            </View>

            {/* XP badge */}
            {current.xpAwarded > 0 && (
              <View style={styles.xpBadge}>
                <Text style={styles.xpBadgeText}>+{current.xpAwarded}</Text>
                <Text style={styles.xpBadgeLabel}>XP</Text>
              </View>
            )}
          </View>

          {/* Bottom gold line */}
          <View style={styles.bottomBar} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 20,
  },
  touchable: { borderRadius: 16, overflow: 'hidden' },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.55)',
  },
  goldBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(212,175,55,0.12)',
    transform: [{ skewX: '-20deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  iconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: { flex: 1 },
  unlockLabel: {
    fontSize: 11,
    color: colors.gold,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  achievementName: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '800',
    marginBottom: 1,
  },
  achievementDesc: {
    fontSize: 11,
    color: '#aaa',
  },
  xpBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(229,9,20,0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.red,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 52,
  },
  xpBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.red,
    lineHeight: 18,
  },
  xpBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.red,
    letterSpacing: 1,
  },
  bottomBar: {
    height: 2,
    backgroundColor: colors.gold,
    opacity: 0.6,
    marginHorizontal: 20,
    borderRadius: 1,
    marginBottom: 4,
  },
});

export default AchievementUnlockToast;
