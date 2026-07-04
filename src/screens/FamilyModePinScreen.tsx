/**
 * FamilyModePinScreen — 4-digit PIN entry for all Family Mode flows.
 *
 * mode: 'setup'   → create PIN (2 steps: enter + confirm)
 *       'unlock'  → verify PIN to unlock for this session
 *       'disable' → verify PIN to disable Family Mode
 *       'change'  → 3-step: old PIN → new PIN → confirm new PIN
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Vibration,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFamilyMode } from '../context/FamilyModeContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type PinMode = 'setup' | 'unlock' | 'disable' | 'change';

type Step =
  | 'enter'           // unlock / disable: single PIN entry
  | 'setup_enter'     // setup step 1
  | 'setup_confirm'   // setup step 2
  | 'change_old'      // change step 1: old PIN
  | 'change_new'      // change step 2: new PIN
  | 'change_confirm'; // change step 3: confirm new PIN

const PIN_LENGTH = 4;

const NUMPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

// ── Component ─────────────────────────────────────────────────────────────────

const FamilyModePinScreen = ({ route, navigation }: any) => {
  const { mode } = route.params as { mode: PinMode };
  const { t } = useTranslation();
  const { unlock, disableFamilyMode, enableFamilyMode, changePin } =
    useFamilyMode();

  const [pin, setPin] = useState('');
  const [step, setStep] = useState<Step>(
    mode === 'setup' ? 'setup_enter' :
    mode === 'change' ? 'change_old' :
    'enter'
  );
  // Stores intermediate PINs during multi-step flows
  // During change: encoded as "oldPin|newPin" after step 2
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const shake = useCallback(() => {
    setPin('');
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== 'web') Vibration.vibrate(200);
  }, [shakeAnim]);

  const getTitle = (): string => {
    switch (step) {
      case 'setup_enter':    return t('fm_pin_create');
      case 'setup_confirm':  return t('fm_pin_confirm');
      case 'change_old':     return t('fm_pin_enter_old');
      case 'change_new':     return t('fm_pin_create_new');
      case 'change_confirm': return t('fm_pin_confirm_new');
      case 'enter':
      default:
        return mode === 'disable' ? t('fm_pin_to_disable') : t('fm_pin_enter');
    }
  };

  const getSubtitle = (): string => {
    switch (step) {
      case 'setup_enter':    return t('fm_pin_create_subtitle');
      case 'setup_confirm':  return t('fm_pin_confirm_subtitle');
      case 'change_old':     return t('fm_pin_old_subtitle');
      case 'change_new':     return t('fm_pin_new_subtitle');
      case 'change_confirm': return t('fm_pin_confirm_subtitle');
      default:               return t('fm_pin_enter_subtitle');
    }
  };

  // ── PIN complete handler ──────────────────────────────────────────────────────

  const handlePinComplete = useCallback(
    async (finalPin: string) => {
      switch (step) {
        // ── unlock / disable ───────────────────────────────────────────────
        case 'enter': {
          if (mode === 'unlock') {
            const ok = await unlock(finalPin);
            if (ok) navigation.goBack();
            else { shake(); setError(t('fm_pin_wrong')); }
          } else if (mode === 'disable') {
            const ok = await disableFamilyMode(finalPin);
            if (ok) navigation.goBack();
            else { shake(); setError(t('fm_pin_wrong')); }
          }
          break;
        }

        // ── setup step 1: store PIN, advance ───────────────────────────────
        case 'setup_enter': {
          setFirstPin(finalPin);
          setPin('');
          setError('');
          setStep('setup_confirm');
          break;
        }

        // ── setup step 2: confirm ──────────────────────────────────────────
        case 'setup_confirm': {
          if (finalPin !== firstPin) {
            shake();
            setError(t('fm_pin_mismatch'));
            // go back to step 1
            setFirstPin('');
            setStep('setup_enter');
          } else {
            await enableFamilyMode(finalPin);
            navigation.goBack();
          }
          break;
        }

        // ── change step 1: verify old PIN ─────────────────────────────────
        case 'change_old': {
          // We optimistically move forward; the real check is at the end.
          // Store old PIN, move to new PIN entry.
          setFirstPin(finalPin);
          setPin('');
          setError('');
          setStep('change_new');
          break;
        }

        // ── change step 2: store new PIN ──────────────────────────────────
        case 'change_new': {
          // encode: "oldPin|newPin"
          setFirstPin(prev => `${prev}|${finalPin}`);
          setPin('');
          setError('');
          setStep('change_confirm');
          break;
        }

        // ── change step 3: confirm new PIN ───────────────────────────────
        case 'change_confirm': {
          const parts = firstPin.split('|');
          const oldPin = parts[0];
          const newPin = parts[1];

          if (finalPin !== newPin) {
            shake();
            setError(t('fm_pin_mismatch'));
            // reset to step 2 with old PIN still stored
            setFirstPin(oldPin);
            setStep('change_new');
          } else {
            const ok = await changePin(oldPin, newPin);
            if (ok) {
              navigation.goBack();
            } else {
              // old PIN was wrong
              shake();
              setError(t('fm_pin_wrong'));
              setFirstPin('');
              setStep('change_old');
            }
          }
          break;
        }
      }
    },
    [
      step, mode, firstPin,
      unlock, disableFamilyMode, enableFamilyMode, changePin,
      navigation, shake, t,
    ]
  );

  // ── Numpad handler ────────────────────────────────────────────────────────────

  const handleKey = useCallback(
    (key: string) => {
      if (key === '') return;
      if (key === '⌫') {
        setPin(p => p.slice(0, -1));
        setError('');
        return;
      }
      if (pin.length >= PIN_LENGTH) return;
      const next = pin + key;
      setPin(next);
      setError('');
      if (next.length === PIN_LENGTH) {
        handlePinComplete(next);
      }
    },
    [pin, handlePinComplete]
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e27" />
      <LinearGradient
        colors={['#0a0e27', '#1a1a2e', '#16213e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Shield icon */}
      <View style={styles.iconWrap}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={44} color="#e50914" />
        </View>
      </View>

      {/* Step indicator for multi-step flows */}
      {(mode === 'setup' || mode === 'change') && (
        <View style={styles.stepRow}>
          {(['setup_enter', 'setup_confirm'].includes(step) ? [0, 1] : [0, 1, 2]).map(
            (_, i) => {
              const stepIndex =
                step === 'setup_enter' ? 0 :
                step === 'setup_confirm' ? 1 :
                step === 'change_old' ? 0 :
                step === 'change_new' ? 1 : 2;
              return (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    i <= stepIndex && styles.stepDotActive,
                  ]}
                />
              );
            }
          )}
        </View>
      )}

      {/* Title / subtitle */}
      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.subtitle}>{getSubtitle()}</Text>

      {/* PIN dots */}
      <Animated.View
        style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < pin.length && styles.dotFilled]}
          />
        ))}
      </Animated.View>

      {/* Error message */}
      <View style={styles.errorContainer}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </View>

      {/* Numpad */}
      <View style={styles.numpad}>
        {NUMPAD_ROWS.map((row, ri) => (
          <View key={ri} style={styles.numpadRow}>
            {row.map((key, ki) => (
              <TouchableOpacity
                key={ki}
                style={[
                  styles.numKey,
                  key === '' && styles.numKeyGhost,
                ]}
                onPress={() => handleKey(key)}
                activeOpacity={key === '' ? 1 : 0.65}
                disabled={key === ''}
              >
                {key === '⌫' ? (
                  <Ionicons name="backspace-outline" size={24} color="#fff" />
                ) : key === '' ? null : (
                  <Text style={styles.numKeyText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Shield icon
  iconWrap: { marginTop: 90, marginBottom: 20 },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  stepDotActive: {
    backgroundColor: '#e50914',
  },

  // Title
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 28,
    paddingHorizontal: 40,
    textAlign: 'center',
    lineHeight: 19,
  },

  // PIN dots
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#e50914',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#e50914',
  },

  // Error
  errorContainer: {
    height: 24,
    marginBottom: 12,
    justifyContent: 'center',
  },
  errorText: {
    color: '#e50914',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Numpad
  numpad: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  numKey: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numKeyGhost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  numKeyText: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '500',
  },
});

export default FamilyModePinScreen;
