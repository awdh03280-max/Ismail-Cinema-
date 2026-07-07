/**
 * DailyRewardModal — الصندوق اليومي
 *
 * Premium animated modal for the daily reward box.
 * Stages: idle → opening → revealed
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ND } from '../utils/animation';
import { DailyRewardResult } from '../hooks/useDailyReward';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Call to trigger the actual claim; returns the reward or null */
  onClaim: () => Promise<DailyRewardResult | null>;
  canClaim: boolean;
  countdown: string;
  claiming: boolean;
}

type Stage = 'idle' | 'opening' | 'revealed';

// ── Reward copy helpers ────────────────────────────────────────────────────────

function rewardTitle(r: DailyRewardResult): string {
  if (r.kind === 'badge') return '🏅 شارة نادرة!';
  return `+${r.xp} XP`;
}

function rewardDescription(r: DailyRewardResult): string {
  if (r.kind === 'badge') return 'حصلت على شارة "المكافأة اليومية" النادرة!';
  if ((r.xp ?? 0) >= 200) return 'مكافأة استثنائية! عد غداً للمزيد.';
  if ((r.xp ?? 0) >= 150) return 'مكافأة رائعة! استمر في مشاهدة الأفلام.';
  return 'رائع! اجمع XP كل يوم لترتفع في المستويات.';
}

function rewardColor(r: DailyRewardResult): string {
  if (r.kind === 'badge') return '#a855f7';
  const xp = r.xp ?? 0;
  if (xp >= 200) return '#f97316';
  if (xp >= 150) return '#eab308';
  if (xp >= 100) return '#d4af37';
  return '#22c55e';
}

// ── Component ─────────────────────────────────────────────────────────────────

const DailyRewardModal: React.FC<Props> = ({
  visible,
  onClose,
  onClaim,
  canClaim,
  countdown,
  claiming,
}) => {
  const [stage, setStage] = useState<Stage>('idle');
  const [reward, setReward] = useState<DailyRewardResult | null>(null);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const revealAnim = useRef(new Animated.Value(0)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setStage('idle');
      setReward(null);
      shakeAnim.setValue(0);
      scaleAnim.setValue(1);
      glowAnim.setValue(0);
      revealAnim.setValue(0);
      particleAnim.setValue(0);
      // Idle pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
        ])
      ).start();
    }
  }, [visible]);

  const handleOpen = useCallback(async () => {
    if (!canClaim || claiming || stage !== 'idle') return;

    // Shake animation
    setStage('opening');
    glowAnim.stopAnimation();

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: ND }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 80, useNativeDriver: ND }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 80, useNativeDriver: ND }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 80, useNativeDriver: ND }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 80, useNativeDriver: ND }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: ND }),
      Animated.timing(scaleAnim, { toValue: 0, duration: 250, easing: Easing.in(Easing.back(2)), useNativeDriver: ND }),
    ]).start(async () => {
      const result = await onClaim();

      if (!result) {
        // Race condition or network failure — reset box to idle/countdown state
        scaleAnim.setValue(1);
        shakeAnim.setValue(0);
        setStage('idle');
        // Restart glow pulse
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
            Animated.timing(glowAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
          ])
        ).start();
        return;
      }

      setReward(result);
      setStage('revealed');

      // Reveal + particle burst
      Animated.parallel([
        Animated.spring(revealAnim, { toValue: 1, useNativeDriver: ND, friction: 5, tension: 80 }),
        Animated.timing(particleAnim, { toValue: 1, duration: 800, useNativeDriver: ND }),
      ]).start();
    });
  }, [canClaim, claiming, stage, onClaim]);

  const shakeInterp = shakeAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-15deg', '0deg', '15deg'] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] });
  const glowScale   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
  const revealScale = revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const revealOpacity = revealAnim;

  // Particles (simple fanning dots)
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const tx = particleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 80] });
    const ty = particleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 80] });
    const op = particleAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });
    return { tx, ty, op };
  });

  const rewardCol = reward ? rewardColor(reward) : '#d4af37';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <View style={styles.card}>
          <LinearGradient
            colors={['#0d0d0d', '#111', '#0a0a0a']}
            style={StyleSheet.absoluteFill}
          />

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Ionicons name="close" size={22} color="#555" />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>🎁 الصندوق اليومي</Text>
          <Text style={styles.subtitle}>مكافأتك اليومية تنتظرك</Text>

          {/* ── Stage: idle / opening ── */}
          {stage !== 'revealed' && (
            <View style={styles.boxArea}>
              {/* Glow ring */}
              <Animated.View
                style={[
                  styles.glowRing,
                  { opacity: glowOpacity, transform: [{ scale: glowScale }] },
                ]}
              />

              {/* The box */}
              <Animated.View
                style={[
                  styles.boxWrapper,
                  {
                    transform: [
                      { rotate: shakeInterp },
                      { scale: scaleAnim },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#1a1400', '#2a2000', '#1a1400']}
                  style={styles.boxGradient}
                >
                  <Text style={styles.boxEmoji}>🎁</Text>
                </LinearGradient>
              </Animated.View>

              {canClaim ? (
                <TouchableOpacity
                  style={[styles.claimBtn, claiming && styles.claimBtnDisabled]}
                  onPress={handleOpen}
                  activeOpacity={0.8}
                  disabled={!canClaim || claiming || stage !== 'idle'}
                >
                  <LinearGradient
                    colors={['#d4af37', '#f4d675', '#d4af37']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.claimBtnGradient}
                  >
                    <Ionicons name="gift-outline" size={18} color="#000" />
                    <Text style={styles.claimBtnText}>
                      {claiming ? 'جارٍ الفتح...' : 'افتح الصندوق'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.countdownArea}>
                  <Ionicons name="time-outline" size={18} color="#d4af37" />
                  <Text style={styles.countdownLabel}>المكافأة التالية خلال</Text>
                  <Text style={styles.countdownText}>{countdown}</Text>
                  <Text style={styles.countdownHint}>عد غداً للحصول على مكافأة جديدة</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Stage: revealed ── */}
          {stage === 'revealed' && reward && (
            <View style={styles.revealArea}>
              {/* Particle burst */}
              <View style={styles.particleContainer} pointerEvents="none">
                {particles.map((p, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.particle,
                      { backgroundColor: i % 2 === 0 ? '#d4af37' : rewardCol },
                      { opacity: p.op, transform: [{ translateX: p.tx }, { translateY: p.ty }] },
                    ]}
                  />
                ))}
              </View>

              <Animated.View
                style={[
                  styles.rewardBubble,
                  { borderColor: rewardCol, opacity: revealOpacity, transform: [{ scale: revealScale }] },
                ]}
              >
                <LinearGradient
                  colors={[`${rewardCol}22`, `${rewardCol}11`, '#0d0d0d']}
                  style={styles.rewardBubbleGrad}
                >
                  <Text style={styles.rewardEmoji}>
                    {reward.kind === 'badge' ? '🏅' : '⭐'}
                  </Text>
                  <Text style={[styles.rewardTitle, { color: rewardCol }]}>
                    {rewardTitle(reward)}
                  </Text>
                  <Text style={styles.rewardDesc}>
                    {rewardDescription(reward)}
                  </Text>
                </LinearGradient>
              </Animated.View>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>رائع! 🎉</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2000',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    alignItems: 'center',
    ...Platform.select({
      default: {
        shadowColor: '#d4af37',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#d4af37',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
  },

  // Box area
  boxArea: {
    alignItems: 'center',
    width: '100%',
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#d4af37',
    top: -20,
  },
  boxWrapper: {
    width: 120,
    height: 120,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    ...Platform.select({
      default: {
        shadowColor: '#d4af37',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 12,
      },
    }),
  },
  boxGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#3a3000',
  },
  boxEmoji: {
    fontSize: 60,
  },

  // Claim button
  claimBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  claimBtnDisabled: { opacity: 0.5 },
  claimBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  claimBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },

  // Countdown
  countdownArea: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  countdownLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  countdownText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#d4af37',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  countdownHint: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
  },

  // Reveal
  revealArea: {
    alignItems: 'center',
    width: '100%',
  },
  particleContainer: {
    position: 'absolute',
    top: 40,
    alignItems: 'center',
    justifyContent: 'center',
    width: 0,
    height: 0,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rewardBubble: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 24,
  },
  rewardBubbleGrad: {
    padding: 28,
    alignItems: 'center',
  },
  rewardEmoji: { fontSize: 56, marginBottom: 12 },
  rewardTitle: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardDesc: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
  },

  doneBtn: {
    backgroundColor: '#d4af37',
    borderRadius: 14,
    height: 52,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
});

export default DailyRewardModal;
