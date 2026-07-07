/**
 * MufarkirCard — 🧠 مفكر AI assistant card.
 *
 * Sits on the Home Screen directly below Movie of the Day. The user types a
 * free-form Arabic (or English) request and receives smart TMDB-backed
 * recommendations. No external AI API required.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Movie } from '../api/tmdb';
import { askMufakir, MufarkirResult } from '../api/mufakir';
import { colors } from '../theme/colors';
import { ND } from '../utils/animation';
import { useFamilyMode } from '../context/FamilyModeContext';
import MovieCard from './MovieCard';

interface Props {
  onMoviePress: (movie: Movie) => void;
}

const SUGGESTIONS = [
  'أريد فيلم أكشن',
  'أريد مسلسل مثل Breaking Bad',
  'أريد فيلم حزين',
  'أريد أنمي',
  'أريد فيلم خيال علمي',
  'أريد كوميديا',
];

const MufarkirCard: React.FC<Props> = ({ onMoviePress }) => {
  const [query, setQuery] = useState('');
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<MufarkirResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestionIdx, setSuggestionIdx] = useState(0);

  // Family Mode — filter results through the same policy as Home sections
  const { filterMovies } = useFamilyMode();

  // Ref guards
  const mounted = useRef(true);
  const isSubmitting = useRef(false); // prevents double-tap race

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Thinking pulse animation
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Result fade-in
  const resultFade = useRef(new Animated.Value(0)).current;

  // Cycle placeholder suggestions every 3 s (no animation — placeholder
  // prop is a plain string; Animated value cannot be applied to it).
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIdx(i => (i + 1) % SUGGESTIONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const startPulse = () => {
    pulseAnim.current?.stop();
    pulse.setValue(1);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: ND,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: ND,
        }),
      ]),
    );
    pulseAnim.current = anim;
    anim.start();
  };

  const stopPulse = () => {
    pulseAnim.current?.stop();
    pulseAnim.current = null;
    pulse.setValue(1);
  };

  // Cleanup on unmount
  useEffect(() => () => { stopPulse(); }, []);

  const handleSubmit = async () => {
    const q = query.trim();
    // Atomic ref-based guard prevents double-tap from launching parallel requests
    if (!q || isSubmitting.current) return;

    isSubmitting.current = true;
    if (mounted.current) {
      setThinking(true);
      setResult(null);
      setError(null);
      resultFade.setValue(0);
    }
    startPulse();

    try {
      // Deliberate 2-second "thinking" pause for UX premium feel
      const [res] = await Promise.all([
        askMufakir(q),
        new Promise<void>(r => setTimeout(r, 2000)),
      ]);

      stopPulse();

      if (!mounted.current) return;

      // Apply Family Mode filter before surfacing results
      const safeMovies = filterMovies(res.movies);
      setResult({ ...res, movies: safeMovies });
      setThinking(false);

      Animated.timing(resultFade, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: ND,
      }).start();
    } catch (err) {
      console.error('Mufakir error:', err);
      stopPulse();
      if (mounted.current) {
        setThinking(false);
        setError('حدث خطأ، حاول مرة ثانية 🙏');
      }
    } finally {
      isSubmitting.current = false;
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Card header */}
      <View style={styles.card}>
        {/* Gold accent bar */}
        <View style={styles.accentBar} />

        <View style={styles.cardInner}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <View style={styles.titleGroup}>
              <Text style={styles.title}>🧠 مفكر</Text>
              <Text style={styles.subtitle}>خليني أفكرلك...</Text>
            </View>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </View>

          {/* Input row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={SUGGESTIONS[suggestionIdx]}
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
              textAlign="right"
              textAlignVertical="center"
              multiline={false}
              editable={!thinking}
              selectionColor={colors.gold}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!query.trim() || thinking) && styles.sendBtnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={!query.trim() || thinking}
            >
              <Ionicons name="send" size={18} color="#fff" style={styles.sendIcon} />
            </TouchableOpacity>
          </View>

          {/* Suggestion chips */}
          {!result && !thinking && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {SUGGESTIONS.slice(0, 4).map(s => (
                <TouchableOpacity
                  key={s}
                  style={styles.chip}
                  onPress={() => {
                    setQuery(s);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Thinking state */}
      {thinking && (
        <Animated.View style={[styles.thinkingRow, { opacity: pulse }]}>
          <Text style={styles.thinkingText}>🧠 مفكر يفكر...</Text>
          <View style={styles.dotsRow}>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Error */}
      {error && !thinking && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {result && !thinking && (
        <Animated.View style={[styles.resultsWrapper, { opacity: resultFade }]}>
          {/* Response message */}
          <View style={styles.messageRow}>
            <Text style={styles.messageText}>{result.message}</Text>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                setResult(null);
                setQuery('');
                setError(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {result.movies.length === 0 ? (
            <Text style={styles.emptyText}>ما لقيت نتائج، جرب كلمة ثانية 🙏</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.resultsRow}
            >
              {result.movies.map(movie => (
                <View key={movie.imdbID} style={styles.cardWrap}>
                  <MovieCard
                    movie={movie}
                    onPress={() => onMoviePress(movie)}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      )}

      {/* Divider */}
      <View style={styles.divider} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.black,
  },

  // Card surface
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: `0 8px 32px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(212,175,55,0.08)`,
      } as object,
      default: {
        shadowColor: colors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  accentBar: {
    height: 3,
    backgroundColor: colors.gold,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardInner: {
    padding: 16,
  },

  // Title
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleGroup: {
    gap: 4,
  },
  title: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'right',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  aiBadge: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: colors.goldMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiBadgeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    textAlign: 'right',
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: `0 4px 16px ${colors.redGlow}` } as object,
      default: {
        shadowColor: colors.red,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 6,
      },
    }),
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceElevated,
    ...Platform.select({
      web: { boxShadow: 'none' } as object,
      default: {
        shadowOpacity: 0,
        elevation: 0,
      },
    }),
  },
  sendIcon: {
    transform: [{ scaleX: -1 }], // flip for RTL feel
  },

  // Suggestion chips
  chipsScroll: {
    marginTop: 12,
  },
  chipsContent: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },

  // Thinking
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  thinkingText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.goldMuted,
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },

  // Results
  resultsWrapper: {
    marginTop: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
  },
  messageText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  resultsRow: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 4,
  },
  cardWrap: {
    width: 148,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },
});

export default MufarkirCard;
