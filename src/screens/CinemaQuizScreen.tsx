/**
 * CinemaQuizScreen — اختبر ذاكرتك السينمائية
 *
 * Stages: intro → active quiz → results
 * Premium dark/gold design consistent with the rest of the app.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ND } from '../utils/animation';
import { useCinemaQuiz } from '../hooks/useCinemaQuiz';

// ── Helpers ───────────────────────────────────────────────────────────────────

const OPTION_LABELS = ['أ', 'ب', 'ج', 'د'];

function scoreGrade(score: number): { label: string; color: string } {
  if (score === 10) return { label: 'ممتاز', color: '#d4af37' };
  if (score >= 8)  return { label: 'رائع', color: '#22c55e' };
  if (score >= 6)  return { label: 'جيد', color: '#3b82f6' };
  if (score >= 4)  return { label: 'مقبول', color: '#f97316' };
  return { label: 'تحتاج مراجعة', color: '#e50914' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Animated progress bar */
const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: current / total,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // width interpolation requires JS driver
    }).start();
  }, [current, total]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, { width }]} />
    </View>
  );
};

const pb = StyleSheet.create({
  track: { height: 4, backgroundColor: '#1a1a1a', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#d4af37', borderRadius: 2 },
});

/** Single option button */
const OptionButton: React.FC<{
  label: string;
  text: string;
  state: 'default' | 'correct' | 'wrong' | 'disabled';
  onPress: () => void;
}> = ({ label, text, state, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: ND }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: ND }),
    ]).start();
    onPress();
  };

  const borderColor =
    state === 'correct' ? '#22c55e' :
    state === 'wrong'   ? '#e50914' :
    '#2a2a2a';

  const bgColor =
    state === 'correct' ? 'rgba(34,197,94,0.12)' :
    state === 'wrong'   ? 'rgba(229,9,20,0.12)' :
    'transparent';

  const labelBg =
    state === 'correct' ? '#22c55e' :
    state === 'wrong'   ? '#e50914' :
    '#1e1e1e';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[opt.btn, { borderColor, backgroundColor: bgColor }]}
        onPress={handlePress}
        disabled={state === 'disabled' || state === 'correct' || state === 'wrong'}
        activeOpacity={0.75}
      >
        <View style={[opt.labelCircle, { backgroundColor: labelBg }]}>
          <Text style={opt.labelText}>{label}</Text>
        </View>
        <Text style={opt.optionText}>{text}</Text>
        {state === 'correct' && (
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={opt.icon} />
        )}
        {state === 'wrong' && (
          <Ionicons name="close-circle" size={20} color="#e50914" style={opt.icon} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const opt = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 12,
  },
  labelCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  labelText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  optionText: { fontSize: 15, color: '#fff', flex: 1, textAlign: 'right' },
  icon: { flexShrink: 0 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

const CinemaQuizScreen = ({ navigation }: any) => {
  const quiz = useCinemaQuiz();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Track which option was tapped so we can show feedback before advancing
  const [tappedIndex, setTappedIndex] = useState<number | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate question card in on index change
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: ND }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
    ]).start();
    setTappedIndex(null);
  }, [quiz.currentIndex, quiz.status]);

  useEffect(() => {
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, []);

  const handleOptionPress = useCallback((idx: number) => {
    if (tappedIndex !== null) return;
    setTappedIndex(idx);

    // Brief pause so the user sees feedback, then submit
    advanceTimer.current = setTimeout(() => {
      quiz.submitAnswer(idx);
    }, 800);
  }, [tappedIndex, quiz.submitAnswer]);

  const getOptionState = (idx: number): 'default' | 'correct' | 'wrong' | 'disabled' => {
    if (tappedIndex === null) return 'default';
    const q = quiz.questions[quiz.currentIndex];
    if (idx === q.correctIndex) return 'correct';
    if (idx === tappedIndex) return 'wrong';
    return 'disabled';
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderIntro = () => (
    <ScrollView contentContainerStyle={s.centeredContent} showsVerticalScrollIndicator={false}>
      <View style={s.brainIconWrap}>
        <Text style={s.brainEmoji}>🧠</Text>
      </View>
      <Text style={s.heroTitle}>اختبر ذاكرتك{'\n'}السينمائية</Text>
      <Text style={s.heroSub}>
        10 أسئلة من الأفلام والمسلسلات التي شاهدتها
      </Text>

      <View style={s.infoRow}>
        <View style={s.infoBox}>
          <Ionicons name="help-circle-outline" size={24} color="#d4af37" />
          <Text style={s.infoNum}>10</Text>
          <Text style={s.infoLabel}>سؤال</Text>
        </View>
        <View style={s.infoDivider} />
        <View style={s.infoBox}>
          <Ionicons name="star-outline" size={24} color="#d4af37" />
          <Text style={s.infoNum}>120</Text>
          <Text style={s.infoLabel}>XP كحد أقصى</Text>
        </View>
        <View style={s.infoDivider} />
        <View style={s.infoBox}>
          <Ionicons name="time-outline" size={24} color="#d4af37" />
          <Text style={s.infoNum}>24h</Text>
          <Text style={s.infoLabel}>مرة يومياً</Text>
        </View>
      </View>

      <TouchableOpacity style={s.startBtn} onPress={quiz.startQuiz} activeOpacity={0.85}>
        <LinearGradient colors={['#d4af37', '#f4d675', '#d4af37']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.startBtnGrad}>
          <Ionicons name="play" size={20} color="#000" />
          <Text style={s.startBtnText}>ابدأ الاختبار</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderQuestion = () => {
    const q = quiz.questions[quiz.currentIndex];
    const total = quiz.questions.length;
    if (!q) return null; // defensive guard: questions array not yet ready

    return (
      <View style={s.questionWrap}>
        {/* Header */}
        <View style={s.qHeader}>
          <Text style={s.qCounter}>{quiz.currentIndex + 1} / {total}</Text>
          <ProgressBar current={quiz.currentIndex + 1} total={total} />
        </View>

        <Animated.ScrollView
          contentContainerStyle={s.questionCard}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Movie poster thumbnail */}
          {q.moviePoster ? (
            <Image source={{ uri: q.moviePoster }} style={s.posterThumb} />
          ) : (
            <View style={[s.posterThumb, s.posterPlaceholder]}>
              <Ionicons name="film-outline" size={32} color="#555" />
            </View>
          )}

          <Text style={s.questionText}>{q.question}</Text>

          <View style={s.optionsWrap}>
            {q.options.map((opt, idx) => (
              <OptionButton
                key={idx}
                label={OPTION_LABELS[idx]}
                text={opt}
                state={getOptionState(idx)}
                onPress={() => handleOptionPress(idx)}
              />
            ))}
          </View>
        </Animated.ScrollView>
      </View>
    );
  };

  const renderAlreadyDone = () => (
    <View style={s.centeredContent}>
      <Text style={s.brainEmoji}>🧠</Text>
      <Text style={s.heroTitle}>أنجزت اختبار اليوم!</Text>
      <Text style={s.heroSub}>عد غداً لاختبار جديد</Text>
      <View style={s.countdownBox}>
        <Ionicons name="time-outline" size={20} color="#d4af37" />
        <Text style={s.countdownLabel}>الاختبار التالي خلال</Text>
        <Text style={s.countdownText}>{quiz.countdown}</Text>
      </View>
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <Text style={s.backBtnText}>العودة</Text>
      </TouchableOpacity>
    </View>
  );

  const renderInsufficient = () => (
    <View style={s.centeredContent}>
      <Text style={{ fontSize: 56, marginBottom: 20 }}>🎬</Text>
      <Text style={s.heroTitle}>محتوى غير كافٍ</Text>
      <Text style={[s.heroSub, { textAlign: 'center', paddingHorizontal: 24 }]}>
        شاهد 4 أفلام أو مسلسلات على الأقل وأضفها لقائمة "أواصل المشاهدة" أو "المفضلة" لتفعيل الاختبار.
      </Text>
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <Text style={s.backBtnText}>العودة</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={s.centeredContent}>
      <Text style={s.brainEmoji}>🧠</Text>
      <Text style={[s.heroSub, { marginTop: 16 }]}>جارٍ تحضير الأسئلة...</Text>
    </View>
  );

  const renderResult = () => {
    if (!quiz.result) return null;
    const { score, xpEarned, message } = quiz.result;
    const total = quiz.questions.length;
    const { label, color } = scoreGrade(score);
    const correctCount = score;
    const wrongCount = total - score;

    return (
      <ScrollView contentContainerStyle={s.resultContent} showsVerticalScrollIndicator={false}>
        {/* Grade badge */}
        <View style={[s.gradeBadge, { borderColor: color }]}>
          <Text style={[s.gradeLabel, { color }]}>{label}</Text>
        </View>

        {/* Score display */}
        <Text style={s.scoreText}>{score}<Text style={s.scoreTotal}> / {total}</Text></Text>
        <Text style={s.scoreSub}>إجاباتك الصحيحة</Text>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
            <Text style={[s.statNum, { color: '#22c55e' }]}>{correctCount}</Text>
            <Text style={s.statLabel}>صحيح</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Ionicons name="close-circle" size={22} color="#e50914" />
            <Text style={[s.statNum, { color: '#e50914' }]}>{wrongCount}</Text>
            <Text style={s.statLabel}>خطأ</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Ionicons name="star" size={22} color="#d4af37" />
            <Text style={[s.statNum, { color: '#d4af37' }]}>+{xpEarned}</Text>
            <Text style={s.statLabel}>XP</Text>
          </View>
        </View>

        {/* Mufakir message */}
        <View style={s.mufakirCard}>
          <LinearGradient colors={['#1a1400', '#141000']} style={s.mufakirGrad}>
            <Text style={s.mufakirIcon}>🧠</Text>
            <View style={s.mufakirTextWrap}>
              <Text style={s.mufakirName}>مفكر</Text>
              <Text style={s.mufakirMsg}>{message}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Answer breakdown */}
        <Text style={s.breakdownTitle}>مراجعة الإجابات</Text>
        {quiz.questions.map((q, i) => {
          const userAns = quiz.answers[i];
          const correct = userAns === q.correctIndex;
          return (
            <View key={q.id} style={s.reviewRow}>
              <View style={[s.reviewDot, { backgroundColor: correct ? '#22c55e' : '#e50914' }]} />
              <View style={s.reviewText}>
                <Text style={s.reviewQ} numberOfLines={2}>{q.question}</Text>
                <Text style={[s.reviewA, { color: correct ? '#22c55e' : '#e50914' }]}>
                  {correct ? '✓ ' : '✗ '}
                  {q.options[q.correctIndex]}
                </Text>
                {!correct && userAns !== null && (
                  <Text style={s.reviewWrong}>إجابتك: {q.options[userAns]}</Text>
                )}
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={s.doneBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={s.doneBtnText}>العودة للملف الشخصي</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <LinearGradient colors={['#000', '#0a0800', '#000']} style={StyleSheet.absoluteFill} />

      {/* Header bar */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {quiz.status === 'finished'
            ? 'نتيجة الاختبار'
            : quiz.status === 'active'
            ? `اختبار اليوم (${quiz.questions.length}/${quiz.questions.length})`
            : 'اختبر ذاكرتك السينمائية'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      {quiz.status === 'loading'               && renderLoading()}
      {quiz.status === 'ready'                 && renderIntro()}
      {quiz.status === 'active'                && renderQuestion()}
      {quiz.status === 'finished'              && renderResult()}
      {quiz.status === 'already_done'          && renderAlreadyDone()}
      {quiz.status === 'insufficient_content'  && renderInsufficient()}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 56, default: 44 }),
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1400',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#d4af37' },

  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  brainIconWrap: {
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: '#0d0d0d',
    borderWidth: 2, borderColor: '#2a2000',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      default: {
        shadowColor: '#d4af37',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
      },
    }),
  },
  brainEmoji: { fontSize: 52 },

  heroTitle: {
    fontSize: 28, fontWeight: '900', color: '#fff',
    textAlign: 'center', lineHeight: 36, marginBottom: 10,
  },
  heroSub: {
    fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },

  infoRow: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    borderRadius: 16,
    borderWidth: 1, borderColor: '#1e1e1e',
    marginBottom: 36,
    overflow: 'hidden',
  },
  infoBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  infoDivider: { width: 1, backgroundColor: '#1e1e1e', marginVertical: 12 },
  infoNum: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 6 },
  infoLabel: { fontSize: 10, color: '#666', marginTop: 2 },

  startBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  startBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 56, borderRadius: 16,
  },
  startBtnText: { fontSize: 17, fontWeight: '900', color: '#000' },

  // Question view
  questionWrap: { flex: 1 },
  qHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  qCounter: { fontSize: 13, color: '#666', fontWeight: '700', textAlign: 'right', marginBottom: 8 },

  questionCard: { paddingHorizontal: 20, paddingBottom: 40 },
  posterThumb: {
    width: 72, height: 100, borderRadius: 8, alignSelf: 'center',
    marginBottom: 20,
    ...Platform.select({
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  posterPlaceholder: { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  questionText: {
    fontSize: 18, fontWeight: '800', color: '#fff',
    textAlign: 'right', lineHeight: 28, marginBottom: 24,
  },
  optionsWrap: {},

  // Already done
  countdownBox: {
    alignItems: 'center', gap: 8,
    backgroundColor: '#0d0d0d',
    borderRadius: 16, borderWidth: 1, borderColor: '#1e1e1e',
    paddingHorizontal: 32, paddingVertical: 24,
    marginBottom: 32,
  },
  countdownLabel: { fontSize: 13, color: '#888' },
  countdownText: {
    fontSize: 38, fontWeight: '900', color: '#d4af37',
    fontVariant: ['tabular-nums'], letterSpacing: 2,
  },

  backBtn: {
    backgroundColor: '#1a1a1a', borderRadius: 14,
    height: 50, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Results
  resultContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  gradeBadge: {
    alignSelf: 'center', borderWidth: 2, borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 6, marginBottom: 16,
  },
  gradeLabel: { fontSize: 14, fontWeight: '800' },
  scoreText: {
    fontSize: 64, fontWeight: '900', color: '#fff', textAlign: 'center',
  },
  scoreTotal: { fontSize: 32, color: '#555' },
  scoreSub: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 24 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0d',
    borderRadius: 16, borderWidth: 1, borderColor: '#1e1e1e',
    marginBottom: 24, overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statDivider: { width: 1, backgroundColor: '#1e1e1e', marginVertical: 10 },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: '#666' },

  mufakirCard: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#2a2000',
    marginBottom: 28,
  },
  mufakirGrad: {
    flexDirection: 'row', alignItems: 'center',
    padding: 18, gap: 14,
  },
  mufakirIcon: { fontSize: 32, flexShrink: 0 },
  mufakirTextWrap: { flex: 1 },
  mufakirName: { fontSize: 11, fontWeight: '800', color: '#d4af37', marginBottom: 4 },
  mufakirMsg: { fontSize: 15, color: '#e0e0e0', lineHeight: 22 },

  breakdownTitle: {
    fontSize: 15, fontWeight: '800', color: '#fff',
    textAlign: 'right', marginBottom: 14,
  },
  reviewRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12, marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#111',
  },
  reviewDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  reviewText: { flex: 1 },
  reviewQ: { fontSize: 13, color: '#ccc', textAlign: 'right', lineHeight: 20, marginBottom: 4 },
  reviewA: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  reviewWrong: { fontSize: 12, color: '#666', textAlign: 'right', marginTop: 2 },

  doneBtn: {
    backgroundColor: '#d4af37', borderRadius: 14, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
  },
  doneBtnText: { fontSize: 16, fontWeight: '900', color: '#000' },
});

export default CinemaQuizScreen;
