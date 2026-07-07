/**
 * مفكر (Mufakir) — smart Arabic-language movie/TV recommendation engine.
 *
 * Parses free-form Arabic (and English) requests, maps keywords to TMDB
 * genre IDs and content types, then fetches relevant titles. No external
 * AI API is required — the intelligence lives in the keyword→genre map
 * and the "similar to X" pattern.
 */
import {
  Movie,
  searchMovies,
  searchTVShows,
  getSimilarTitles,
  getRecommendedTitles,
  getTrendingNow,
  getTopRatedMovies,
  getTopRatedTVShows,
  getAnime,
  discoverMoviesByGenreIds,
  discoverTVByGenreIds,
} from './tmdb';

// ── Genre map ─────────────────────────────────────────────────────────────────

interface GenreEntry {
  keywords: string[];
  /** TMDB movie genre IDs */
  movieIds: number[];
  /** TMDB TV genre IDs */
  tvIds: number[];
  /** Arabic response label, e.g. "أفلام الأكشن" */
  label: string;
}

const GENRE_ENTRIES: GenreEntry[] = [
  {
    keywords: ['أكشن', 'اكشن', 'action', 'حركة', 'مثير للحماس'],
    movieIds: [28],
    tvIds: [10759],
    label: 'أفلام الأكشن',
  },
  {
    keywords: ['كوميدي', 'كوميديا', 'مضحك', 'comedy', 'ضحك', 'فكاهة'],
    movieIds: [35],
    tvIds: [35],
    label: 'الكوميديا',
  },
  {
    keywords: ['رعب', 'مرعب', 'مخيف', 'horror', 'خوف', 'رهبة', 'مريع'],
    movieIds: [27],
    tvIds: [27],
    label: 'أفلام الرعب',
  },
  {
    keywords: ['دراما', 'drama', 'انساني', 'إنساني'],
    movieIds: [18],
    tvIds: [18],
    label: 'الدراما',
  },
  {
    keywords: [
      'خيال علمي',
      'خيال العلمي',
      'sci-fi',
      'science fiction',
      'علم الخيال',
      'فضاء',
      'مستقبل',
      'روبوت',
    ],
    movieIds: [878],
    tvIds: [10765],
    label: 'الخيال العلمي',
  },
  {
    keywords: ['رومانسي', 'رومانس', 'رومانسية', 'حب', 'romance', 'romantic', 'عاطفي', 'غرام'],
    movieIds: [10749],
    tvIds: [10749],
    label: 'الرومانسية',
  },
  {
    keywords: ['إثارة', 'اثارة', 'تشويق', 'مشوق', 'thriller', 'suspense', 'توتر'],
    movieIds: [53],
    tvIds: [53],
    label: 'الإثارة والتشويق',
  },
  {
    keywords: ['جريمة', 'جرائم', 'crime', 'تحقيق', 'محقق', 'قتل', 'جنائي'],
    movieIds: [80],
    tvIds: [80],
    label: 'الجريمة',
  },
  {
    keywords: ['مغامرة', 'adventure', 'استكشاف', 'مغامرات'],
    movieIds: [12],
    tvIds: [10759],
    label: 'المغامرة',
  },
  {
    keywords: ['غموض', 'غامض', 'mystery', 'لغز', 'ألغاز', 'غرائب'],
    movieIds: [9648],
    tvIds: [9648],
    label: 'الغموض والألغاز',
  },
  {
    keywords: ['حرب', 'war', 'عسكري', 'قتال', 'معارك', 'جندي'],
    movieIds: [10752],
    tvIds: [10768],
    label: 'أفلام الحرب',
  },
  {
    keywords: ['عائلي', 'أطفال', 'عيال', 'family', 'kids', 'ولاد'],
    movieIds: [10751],
    tvIds: [10751],
    label: 'العائلة والأطفال',
  },
  {
    keywords: ['تاريخي', 'تاريخ', 'history', 'تراث', 'قديم', 'حضارة'],
    movieIds: [36],
    tvIds: [36],
    label: 'التاريخ',
  },
  {
    keywords: ['وثائقي', 'documentary', 'وثائقية', 'حقيقي', 'واقعي'],
    movieIds: [99],
    tvIds: [99],
    label: 'الوثائقيات',
  },
  {
    keywords: ['فانتازيا', 'fantasy', 'خيال', 'سحر', 'ساحر', 'تنين', 'مملكة'],
    movieIds: [14],
    tvIds: [10765],
    label: 'الفانتازيا',
  },
  {
    keywords: ['حزين', 'مؤثر', 'بكاء', 'يبكي', 'sad', 'emotional', 'دموع', 'حزينة', 'مبكي'],
    movieIds: [18],
    tvIds: [18],
    label: 'الأفلام المؤثرة',
  },
  {
    keywords: ['موسيقى', 'music', 'musical', 'غناء', 'موسيقي'],
    movieIds: [10402],
    tvIds: [10402],
    label: 'الموسيقى والغناء',
  },
  {
    keywords: ['رياضة', 'sport', 'رياضي', 'كرة', 'ملاكمة', 'سباق'],
    movieIds: [10770],
    tvIds: [10767],
    label: 'الرياضة',
  },
  {
    keywords: ['قصص قصيرة', 'انثولوجي', 'anthology'],
    movieIds: [18, 53],
    tvIds: [18, 53],
    label: 'القصص المتنوعة',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise query: lowercase, strip diacritics, collapse whitespace. */
const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // strip Arabic diacritics
    .replace(/\s+/g, ' ')
    .trim();

/** True if the normalised query contains the keyword (word-boundary aware). */
const hasKeyword = (norm: string, kw: string) => norm.includes(kw.toLowerCase());

// ── Content-type detection ────────────────────────────────────────────────────

type ContentType = 'movie' | 'tv' | 'anime' | 'both';

const detectContentType = (norm: string): ContentType => {
  const tvKw = ['مسلسل', 'مسلسلات', 'سيريال', 'series', 'show', 'برنامج', 'حلقات', 'موسم'];
  const movieKw = ['فيلم', 'أفلام', 'افلام', 'movie', 'cinema', 'سينما'];
  const animeKw = ['أنمي', 'انمي', 'anime', 'انيمي', 'كرتون ياباني'];

  if (animeKw.some(k => hasKeyword(norm, k))) return 'anime';
  if (tvKw.some(k => hasKeyword(norm, k))) return 'tv';
  if (movieKw.some(k => hasKeyword(norm, k))) return 'movie';
  return 'both';
};

// ── "Similar to X" pattern ────────────────────────────────────────────────────

const SIMILAR_MARKERS = [
  'مثل', 'زي', 'يشبه', 'شبيه', 'نفس نوع', 'على غرار', 'similar to', 'like',
];

interface SimilarQuery {
  found: true;
  titleQuery: string;
  contentType: ContentType;
}
interface NoSimilar {
  found: false;
}

const detectSimilar = (norm: string, ct: ContentType): SimilarQuery | NoSimilar => {
  for (const marker of SIMILAR_MARKERS) {
    const markerNorm = marker.toLowerCase();
    const idx = norm.indexOf(markerNorm);
    if (idx !== -1) {
      // Slice from the normalised string — avoids diacritic/spacing offset mismatch
      const after = norm.slice(idx + markerNorm.length).trim();
      if (after.length > 1) {
        return { found: true, titleQuery: after, contentType: ct };
      }
    }
  }
  return { found: false };
};

// ── Genre detection ───────────────────────────────────────────────────────────

interface GenreMatch {
  entry: GenreEntry;
  score: number;
}

const detectGenres = (norm: string): GenreMatch[] => {
  const matches: GenreMatch[] = [];
  for (const entry of GENRE_ENTRIES) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (hasKeyword(norm, kw)) score += kw.length; // longer match = higher confidence
    }
    if (score > 0) matches.push({ entry, score });
  }
  return matches.sort((a, b) => b.score - a.score);
};

// ── Public result type ────────────────────────────────────────────────────────

export interface MufarkirResult {
  movies: Movie[];
  /** Arabic summary shown above the results. */
  message: string;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export const askMufakir = async (query: string): Promise<MufarkirResult> => {
  const norm = normalise(query);
  const ct = detectContentType(norm);

  // ── 1. "Similar to X" ───────────────────────────────────────────────────────
  const similar = detectSimilar(norm, ct);
  if (similar.found) {
    const titleQuery = similar.titleQuery;

    // When content type is ambiguous ('both'), search movie AND TV in parallel
    // and pick the highest-voted result as the reference title.
    let ref: Movie | null = null;
    if (ct === 'tv' || ct === 'anime') {
      const results = await searchTVShows(titleQuery);
      ref = results[0] ?? null;
    } else if (ct === 'movie') {
      const results = await searchMovies(titleQuery);
      ref = results[0] ?? null;
    } else {
      // 'both' — search both and pick the winner by vote count
      const [movies, shows] = await Promise.all([
        searchMovies(titleQuery),
        searchTVShows(titleQuery),
      ]);
      const best = (arr: Movie[]) => arr[0] ?? null;
      const topMovie = best(movies);
      const topShow = best(shows);
      if (topMovie && topShow) {
        ref = topMovie.voteCount >= topShow.voteCount ? topMovie : topShow;
      } else {
        ref = topMovie ?? topShow;
      }
    }

    if (ref) {
      const refType = ref.contentType;
      const [sim, rec] = await Promise.all([
        getSimilarTitles(ref.imdbID, refType),
        getRecommendedTitles(ref.imdbID, refType),
      ]);

      // Merge, dedupe, take top 15
      const seen = new Set<string>();
      const merged: Movie[] = [];
      for (const m of [...sim, ...rec]) {
        if (!seen.has(m.imdbID)) {
          seen.add(m.imdbID);
          merged.push(m);
        }
        if (merged.length >= 15) break;
      }

      if (merged.length) {
        const typeLabel = refType === 'tv' ? 'مسلسلات' : 'أفلام';
        return {
          movies: merged,
          message: `إليك ${typeLabel} مشابهة لـ "${ref.Title}" 🎬`,
        };
      }
    }

    // Fallback: plain search results
    const fallback = ct === 'tv'
      ? await searchTVShows(titleQuery)
      : await searchMovies(titleQuery);
    return {
      movies: fallback.slice(0, 15),
      message: fallback.length
        ? `نتائج البحث عن "${titleQuery}" 🔍`
        : 'ما قدرت أفهم الطلب، جرب تكتب اسم واضح 🙏',
    };
  }

  // ── 2. Anime shortcut ────────────────────────────────────────────────────────
  if (ct === 'anime') {
    const anime = await getAnime();
    return { movies: anime.slice(0, 15), message: 'إليك أفضل الأنمي المتاح 🎌' };
  }

  // ── 3. Genre-based discovery ─────────────────────────────────────────────────
  const genreMatches = detectGenres(norm);

  if (genreMatches.length) {
    const top = genreMatches[0].entry;
    const secondaryIds =
      genreMatches.length > 1 ? genreMatches[1].entry.movieIds : [];

    let movies: Movie[] = [];

    if (ct === 'tv') {
      movies = await discoverTVByGenreIds(top.tvIds);
    } else if (ct === 'movie') {
      movies = await discoverMoviesByGenreIds(top.movieIds);
    } else {
      // both — interleave movies and TV
      const [mv, tv] = await Promise.all([
        discoverMoviesByGenreIds(top.movieIds),
        discoverTVByGenreIds(top.tvIds),
      ]);
      // Interleave: movie, tv, movie, tv...
      const maxLen = Math.max(mv.length, tv.length);
      for (let i = 0; i < maxLen && movies.length < 20; i++) {
        if (mv[i]) movies.push(mv[i]);
        if (tv[i] && movies.length < 20) movies.push(tv[i]);
      }
    }

    const typeLabel =
      ct === 'tv' ? 'مسلسلات' : ct === 'movie' ? 'أفلام' : 'أفلام ومسلسلات';

    return {
      movies: movies.slice(0, 15),
      message:
        movies.length
          ? `إليك أفضل ${typeLabel} ${top.label} 🍿`
          : `ما لقيت نتائج لـ ${top.label}، جرب شي ثاني 🙏`,
    };
  }

  // ── 4. Generic type-based fallback ──────────────────────────────────────────
  if (ct === 'tv') {
    const shows = await getTopRatedTVShows();
    return {
      movies: shows.slice(0, 15),
      message: 'إليك أعلى المسلسلات تقييماً 🌟',
    };
  }
  if (ct === 'movie') {
    const movies = await getTopRatedMovies();
    return {
      movies: movies.slice(0, 15),
      message: 'إليك أعلى الأفلام تقييماً 🌟',
    };
  }

  // ── 5. Absolute fallback: trending ──────────────────────────────────────────
  const trending = await getTrendingNow();
  return {
    movies: trending.slice(0, 15),
    message: 'إليك ما يشاهده الناس الآن 🔥',
  };
};
