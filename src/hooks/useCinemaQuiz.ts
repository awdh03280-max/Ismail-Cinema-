/**
 * useCinemaQuiz — اختبر ذاكرتك السينمائية
 *
 * Generates up to 10 trivia questions from the user's watched/favorite content,
 * enforces a 24 h cooldown via Firestore (checked both at init AND in the write
 * transaction to block multi-session abuse), and awards proportional XP.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useXP } from '../context/XPContext';
import { getContinueWatching, getFavorites } from '../storage/storage';
import { getMovieDetails, getTVShowDetails, Movie } from '../api/tmdb';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];        // 4 shuffled options
  correctIndex: number;     // index into options[]
  movieTitle: string;
  moviePoster: string;
}

export type QuizStatus =
  | 'loading'
  | 'ready'
  | 'active'
  | 'finished'
  | 'already_done'
  | 'insufficient_content';

export interface QuizResult {
  score: number;
  total: number;
  xpEarned: number;
  message: string;
}

export interface CinemaQuizState {
  status: QuizStatus;
  questions: QuizQuestion[];
  currentIndex: number;
  answers: (number | null)[];
  result: QuizResult | null;
  countdown: string;
  startQuiz: () => void;
  submitAnswer: (optionIndex: number) => void;
  resetQuiz: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const QUIZ_SIZE = 10;

const XP_TABLE: Record<number, number> = {
  0: 5, 1: 10, 2: 15, 3: 25, 4: 35,
  5: 50, 6: 60, 7: 75, 8: 90, 9: 105, 10: 120,
};

function getMufakirMessage(score: number, total: number): string {
  const pct = total > 0 ? score / total : 0;
  if (pct === 1)    return 'ممتاز! ذاكرتك السينمائية قوية جداً. 🌟';
  if (pct >= 0.8)   return 'رائع! أنت من عشاق السينما الحقيقيين. 🎬';
  if (pct >= 0.6)   return 'جيد! لكن ما زال أمامك مجال للتحسّن. 💪';
  if (pct >= 0.4)   return 'مش بطال! لكن يمكنك تحسين نتيجتك. 🎯';
  if (score >= 1)   return 'شكلّك تحتاج تعيد بعض الأفلام 😄';
  return 'يا صاحبي... ما شفت أفلام كفاية! 😅';
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, count);
}

// ── Question generation ───────────────────────────────────────────────────────

type QuestionType = 'year' | 'director' | 'genre' | 'cast' | 'rating' | 'country';

interface QTemplate {
  type: QuestionType;
  question: (title: string, isTV: boolean) => string;
  getValue: (m: Movie) => string | null;
  getDistractors: (pool: Movie[], exclude: Movie) => string[];
}

const QUESTION_TEMPLATES: QTemplate[] = [
  {
    type: 'year',
    question: (t, tv) => `في أي سنة صدر ${tv ? 'مسلسل' : 'فيلم'} «${t}»؟`,
    getValue: m => m.Year || null,
    getDistractors: (_pool, excl) => {
      const year = parseInt(excl.Year, 10);
      if (!year) return [];
      return shuffle([-3, -2, -1, 1, 2, 3]).slice(0, 3).map(o => String(year + o));
    },
  },
  {
    type: 'director',
    question: (t, tv) => `من أخرج ${tv ? 'مسلسل' : 'فيلم'} «${t}»؟`,
    getValue: m => m.Director || null,
    getDistractors: (pool, excl) =>
      pool
        .filter(m => m.Director && m.Director !== excl.Director && m.imdbID !== excl.imdbID)
        .map(m => m.Director)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 3),
  },
  {
    type: 'genre',
    question: (t, tv) => `ما نوع ${tv ? 'مسلسل' : 'فيلم'} «${t}»؟`,
    getValue: m => m.Genre ? m.Genre.split(',')[0].trim() : null,
    getDistractors: (pool, excl) => {
      const excGenre = excl.Genre?.split(',')[0].trim();
      return pool
        .filter(m => m.imdbID !== excl.imdbID)
        .flatMap(m => (m.Genre || '').split(',').map(g => g.trim()))
        .filter(g => g && g !== excGenre)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 3);
    },
  },
  {
    type: 'cast',
    question: (t, tv) => `من يبطل ${tv ? 'مسلسل' : 'فيلم'} «${t}»؟`,
    getValue: m => m.Cast ? m.Cast.split(',')[0].trim() : null,
    getDistractors: (pool, excl) => {
      const excActor = excl.Cast?.split(',')[0].trim();
      return pool
        .filter(m => m.imdbID !== excl.imdbID)
        .flatMap(m => (m.Cast || '').split(',').map(c => c.trim()))
        .filter(a => a && a !== excActor)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 3);
    },
  },
  {
    type: 'rating',
    question: (t, tv) => `ما تقييم ${tv ? 'مسلسل' : 'فيلم'} «${t}» على TMDB؟`,
    getValue: m => (m.imdbRating && m.imdbRating !== '0.0') ? m.imdbRating : null,
    getDistractors: (_pool, excl) => {
      const base = parseFloat(excl.imdbRating);
      if (!base) return [];
      return shuffle([-0.8, -0.5, 0.5, 0.8, 1.2, -1.2])
        .map(o => Math.max(1, Math.min(10, base + o)).toFixed(1))
        .filter((v, i, a) => a.indexOf(v) === i && v !== excl.imdbRating)
        .slice(0, 3);
    },
  },
  {
    type: 'country',
    question: (t, tv) => `في أي دولة أُنتج ${tv ? 'مسلسل' : 'فيلم'} «${t}»؟`,
    getValue: m => m.Country ? m.Country.split(',')[0].trim() : null,
    getDistractors: (pool, excl) => {
      const excCountry = excl.Country?.split(',')[0].trim();
      return pool
        .filter(m => m.imdbID !== excl.imdbID)
        .flatMap(m => (m.Country || '').split(',').map(c => c.trim()))
        .filter(c => c && c !== excCountry)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 3);
    },
  },
];

function generateQuestionsFromPool(movies: Movie[]): QuizQuestion[] {
  const used = new Set<string>(); // `${imdbID}_${type}`
  const questions: QuizQuestion[] = [];

  // Pass 1 — one question per movie (best template)
  for (const movie of shuffle(movies)) {
    if (questions.length >= QUIZ_SIZE) break;
    const isTV = movie.contentType === 'tv';

    for (const tmpl of shuffle(QUESTION_TEMPLATES)) {
      const key = `${movie.imdbID}_${tmpl.type}`;
      if (used.has(key)) continue;
      const answer = tmpl.getValue(movie);
      if (!answer) continue;
      const distractors = tmpl.getDistractors(movies, movie);
      if (distractors.length < 3) continue;

      const shuffled = shuffle([answer, ...distractors.slice(0, 3)]);
      questions.push({
        id: key,
        question: tmpl.question(movie.Title, isTV),
        options: shuffled,
        correctIndex: shuffled.indexOf(answer),
        movieTitle: movie.Title,
        moviePoster: movie.Poster,
      });
      used.add(key);
      break;
    }
  }

  // Pass 2 — fill remaining slots with extra templates per movie
  if (questions.length < QUIZ_SIZE) {
    for (const movie of shuffle(movies)) {
      if (questions.length >= QUIZ_SIZE) break;
      const isTV = movie.contentType === 'tv';

      for (const tmpl of shuffle(QUESTION_TEMPLATES)) {
        if (questions.length >= QUIZ_SIZE) break;
        const key = `${movie.imdbID}_${tmpl.type}`;
        if (used.has(key)) continue;
        const answer = tmpl.getValue(movie);
        if (!answer) continue;
        const distractors = tmpl.getDistractors(movies, movie);
        if (distractors.length < 3) continue;

        const shuffled = shuffle([answer, ...distractors.slice(0, 3)]);
        questions.push({
          id: key,
          question: tmpl.question(movie.Title, isTV),
          options: shuffled,
          correctIndex: shuffled.indexOf(answer),
          movieTitle: movie.Title,
          moviePoster: movie.Poster,
        });
        used.add(key);
      }
    }
  }

  return questions.slice(0, QUIZ_SIZE);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCinemaQuiz(): CinemaQuizState {
  const { user } = useAuth();
  const { awardXP } = useXP();

  const [status, setStatus] = useState<QuizStatus>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [nextQuizAt, setNextQuizAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');

  // resetKey increments trigger a full re-initialisation via the useEffect
  const [resetKey, setResetKey] = useState(0);

  // Prevents concurrent/double answer submissions
  const submittingRef = useRef(false);

  // ── Countdown ticker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!nextQuizAt) return;
    const tick = () => {
      const rem = nextQuizAt - Date.now();
      if (rem <= 0) {
        setStatus('ready');
        setNextQuizAt(null);
        setCountdown('');
      } else {
        setCountdown(formatCountdown(rem));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextQuizAt]);

  // ── Initialisation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const init = async () => {
      setStatus('loading');
      submittingRef.current = false;

      try {
        // 1. Check 24 h cooldown from Firestore
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.exists() ? (snap.data() as Record<string, any>) : {};
        const lastQuizAt: number = data?.cinemaQuiz?.lastQuizAt ?? 0;
        const next = lastQuizAt + TWENTY_FOUR_HOURS;

        if (Date.now() < next) {
          if (!cancelled) { setNextQuizAt(next); setStatus('already_done'); }
          return;
        }

        // 2. Gather watched content from AsyncStorage
        const [watching, favs] = await Promise.all([
          getContinueWatching(),
          getFavorites(),
        ]);

        const allIds = new Map<string, 'movie' | 'tv'>();
        for (const w of watching) allIds.set(w.imdbID, w.contentType ?? 'movie');
        for (const f of favs)     allIds.set(f.imdbID, f.contentType ?? 'movie');

        if (allIds.size < 4) {
          if (!cancelled) setStatus('insufficient_content');
          return;
        }

        // 3. Fetch TMDB details (cap at 20 for speed)
        const entries = pick([...allIds.entries()], 20);
        const settled = await Promise.allSettled(
          entries.map(([id, ct]) =>
            ct === 'tv' ? getTVShowDetails(id) : getMovieDetails(id)
          )
        );

        const movies: Movie[] = settled
          .filter((r): r is PromiseFulfilledResult<Movie> => r.status === 'fulfilled')
          .map(r => r.value)
          .filter(m => m.Title && m.Year);

        if (movies.length < 4) {
          if (!cancelled) setStatus('insufficient_content');
          return;
        }

        // 4. Generate questions
        const qs = generateQuestionsFromPool(movies);
        if (qs.length < 4) {
          if (!cancelled) setStatus('insufficient_content');
          return;
        }

        if (!cancelled) {
          setQuestions(qs);
          setAnswers(Array(qs.length).fill(null));
          setCurrentIndex(0);
          setResult(null);
          setStatus('ready');
        }
      } catch (err) {
        console.error('[CinemaQuiz] Init error:', err);
        if (!cancelled) setStatus('insufficient_content');
      }
    };

    init();
    return () => { cancelled = true; };
    // resetKey intentionally included so resetQuiz triggers a full re-init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, resetKey]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const startQuiz = useCallback(() => {
    if (status !== 'ready') return;
    setStatus('active');
  }, [status]);

  const submitAnswer = useCallback(async (optionIndex: number) => {
    if (status !== 'active') return;
    if (submittingRef.current) return; // idempotency guard
    if (questions.length === 0) return;
    if (currentIndex >= questions.length) return;

    submittingRef.current = true;

    const newAnswers = [...answers];
    // Ensure answers array is the right length before writing
    while (newAnswers.length < questions.length) newAnswers.push(null);
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);

    const isLast = currentIndex === questions.length - 1;

    if (!isLast) {
      setCurrentIndex(i => i + 1);
      submittingRef.current = false;
      return;
    }

    // ── Quiz complete ─────────────────────────────────────────────────────────
    const score = newAnswers
      .slice(0, questions.length)
      .reduce<number>(
        (acc, ans, i) => acc + (ans !== null && ans === questions[i]?.correctIndex ? 1 : 0),
        0
      );
    const xpKey = Math.min(score, 10) as keyof typeof XP_TABLE;
    const xpEarned = XP_TABLE[xpKey] ?? 5;
    const total = questions.length;
    const message = getMufakirMessage(score, total);

    // Save to Firestore — enforce 24 h cooldown inside the transaction
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const now = Date.now();
      try {
        await runTransaction(db, async txn => {
          const snap = await txn.get(userRef);
          const d = snap.exists() ? (snap.data() as Record<string, any>) : {};
          const prevLastQuizAt: number = d?.cinemaQuiz?.lastQuizAt ?? 0;

          // Server-side cooldown guard — abort if another session already submitted today
          if (now - prevLastQuizAt < TWENTY_FOUR_HOURS) {
            throw Object.assign(new Error('ALREADY_DONE'), { code: 'ALREADY_DONE' });
          }

          const prev = d?.cinemaQuiz ?? {};
          txn.set(
            userRef,
            {
              cinemaQuiz: {
                lastQuizAt: now,
                lastScore: score,
                totalQuizzes: (prev.totalQuizzes ?? 0) + 1,
                bestScore: Math.max(prev.bestScore ?? 0, score),
              },
            },
            { merge: true }
          );
        });

        await awardXP(xpEarned);
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        if (e?.code === 'ALREADY_DONE' || e?.message === 'ALREADY_DONE') {
          // Race: another session beat us — show already_done instead
          try {
            const freshSnap = await getDoc(doc(db, 'users', user.uid));
            const freshData = freshSnap.exists() ? (freshSnap.data() as Record<string, any>) : {};
            const next = (freshData?.cinemaQuiz?.lastQuizAt ?? Date.now()) + TWENTY_FOUR_HOURS;
            setNextQuizAt(next);
            setStatus('already_done');
          } catch {
            setStatus('already_done');
          } finally {
            submittingRef.current = false;
          }
          return;
        }
        console.error('[CinemaQuiz] Save error:', err);
        // Still show result even if save failed — don't punish the user
      }
    }

    setResult({ score, total, xpEarned, message });
    setStatus('finished');
    submittingRef.current = false;
  }, [status, currentIndex, answers, questions, user, awardXP]);

  /**
   * resetQuiz — increments resetKey which causes the useEffect to re-run a
   * full re-initialisation (re-fetch cooldown, re-build question pool, etc.).
   */
  const resetQuiz = useCallback(() => {
    setResetKey(k => k + 1);
  }, []);

  return {
    status,
    questions,
    currentIndex,
    answers,
    result,
    countdown,
    startQuiz,
    submitAnswer,
    resetQuiz,
  };
}
