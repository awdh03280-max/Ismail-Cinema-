/**
 * ActorProfileScreen — Cinema-grade actor biography & filmography page.
 *
 * Sections:
 *   ① Hero — large profile image with gold gradient overlay, name, department badge
 *   ② Stats row — age, birthday, birthplace, popularity
 *   ③ Biography — expandable long-form text
 *   ④ Known For — top 6 titles horizontal scroll
 *   ⑤ Works tabs (Movies | TV Shows) with animated indicator + count badges
 *   ⑥ Search bar — filters titles within the active tab in real time
 *   ⑦ Filmography grid — 2-column poster cards, tappable → MovieDetails
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  getPersonDetails,
  getPersonCombinedCredits,
  PersonDetails,
  PersonCredit,
} from '../api/tmdb';
import { colors } from '../theme/colors';
import { ND } from '../utils/animation';

// ── Constants ─────────────────────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(SH * 0.52);
const POSTER_W = (SW - 48) / 2;
const POSTER_H = Math.round(POSTER_W * 1.5);
const STATUS_BAR_H = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight ?? 24;

// ── Helpers ───────────────────────────────────────────────────────────────────

const calcAge = (birthday: string | null, deathday: string | null): string => {
  if (!birthday) return '—';
  const end = deathday ? new Date(deathday) : new Date();
  const born = new Date(birthday);
  let age = end.getFullYear() - born.getFullYear();
  const m = end.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < born.getDate())) age--;
  return deathday ? `${age} (deceased)` : String(age);
};

const formatDate = (d: string | null): string => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return d;
  }
};

const formatYear = (d: string): string => (d ? d.substring(0, 4) : '');

const popularityLabel = (p: number): string => {
  if (p >= 100) return 'Mega Star';
  if (p >= 50) return 'A-List';
  if (p >= 20) return 'Popular';
  if (p >= 10) return 'Rising';
  return 'Known';
};

// ── Sub-components ────────────────────────────────────────────────────────────

// Small numeric stat card
const StatCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  gold?: boolean;
}> = ({ icon, label, value, gold }) => (
  <View style={statStyles.card}>
    <Ionicons name={icon} size={16} color={gold ? colors.gold : colors.textMuted} />
    <Text style={statStyles.label}>{label}</Text>
    <Text style={[statStyles.value, gold && { color: colors.gold }]} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  value: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 17,
  },
});

// Known-for horizontal card
const KnownForCard: React.FC<{
  credit: PersonCredit;
  onPress: () => void;
}> = ({ credit, onPress }) => (
  <TouchableOpacity style={kfStyles.card} onPress={onPress} activeOpacity={0.8}>
    {credit.poster_path ? (
      <Image source={{ uri: credit.poster_path }} style={kfStyles.poster} resizeMode="cover" />
    ) : (
      <View style={[kfStyles.poster, kfStyles.posterFallback]}>
        <Ionicons name="film-outline" size={22} color={colors.textMuted} />
      </View>
    )}
    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={kfStyles.gradient} />
    <View style={kfStyles.badge}>
      <Ionicons
        name={credit.media_type === 'tv' ? 'tv-outline' : 'film-outline'}
        size={9}
        color="#000"
      />
      <Text style={kfStyles.badgeText}>{credit.media_type === 'tv' ? 'TV' : 'Film'}</Text>
    </View>
    <Text style={kfStyles.title} numberOfLines={2}>{credit.title}</Text>
  </TouchableOpacity>
);

const kfStyles = StyleSheet.create({
  card: {
    width: 110,
    height: 162,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
  },
  posterFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  badge: {
    position: 'absolute',
    top: 7,
    right: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.gold,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
  title: {
    position: 'absolute',
    bottom: 7,
    left: 6,
    right: 6,
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 14,
  },
});

// Filmography grid poster card
const FilmCard: React.FC<{
  credit: PersonCredit;
  onPress: () => void;
}> = ({ credit, onPress }) => (
  <TouchableOpacity
    style={filmStyles.card}
    onPress={onPress}
    activeOpacity={0.82}
  >
    {credit.poster_path ? (
      <Image source={{ uri: credit.poster_path }} style={filmStyles.poster} resizeMode="cover" />
    ) : (
      <View style={[filmStyles.poster, filmStyles.posterFallback]}>
        <Ionicons name="film-outline" size={28} color={colors.textMuted} />
      </View>
    )}
    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={filmStyles.gradient} />

    {/* Rating chip */}
    {credit.vote_average > 0 && (
      <View style={filmStyles.ratingChip}>
        <Ionicons name="star" size={9} color={colors.gold} />
        <Text style={filmStyles.ratingText}>{credit.vote_average.toFixed(1)}</Text>
      </View>
    )}

    <View style={filmStyles.info}>
      <Text style={filmStyles.title} numberOfLines={2}>{credit.title}</Text>
      {!!credit.character && (
        <Text style={filmStyles.character} numberOfLines={1}>as {credit.character}</Text>
      )}
      <Text style={filmStyles.year}>{formatYear(credit.release_date)}</Text>
    </View>
  </TouchableOpacity>
);

const filmStyles = StyleSheet.create({
  card: {
    width: POSTER_W,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  poster: {
    width: '100%',
    height: POSTER_H,
  },
  posterFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: POSTER_H * 0.55,
  },
  ratingChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  ratingText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    gap: 2,
  },
  title: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '800',
    lineHeight: 17,
  },
  character: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontStyle: 'italic',
  },
  year: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

interface Props {
  route: {
    params: {
      personId: number;
      name: string;
      profilePath: string | null;
    };
  };
  navigation: any;
}

const ActorProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { personId, name: initialName, profilePath: initialProfilePath } = route.params;

  // ── State ─────────────────────────────────────────────────────────────────
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [credits, setCredits] = useState<{ cast: PersonCredit[]; crew: PersonCredit[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>('movies');
  const [searchQuery, setSearchQuery] = useState('');
  const mountedRef = useRef(true);

  // ── Animations ────────────────────────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({ inputRange: [HERO_HEIGHT - 100, HERO_HEIGHT], outputRange: [0, 1], extrapolate: 'clamp' });
  const heroScale = scrollY.interpolate({ inputRange: [-80, 0], outputRange: [1.12, 1], extrapolate: 'clamp' });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, HERO_HEIGHT * 0.6], outputRange: [1, 0.3], extrapolate: 'clamp' });

  const tabIndicatorX = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    contentFade.setValue(0);
    contentSlide.setValue(24);

    Promise.all([
      getPersonDetails(personId),
      getPersonCombinedCredits(personId),
    ])
      .then(([details, combinedCredits]) => {
        if (cancelled) return;
        setPerson(details);
        setCredits(combinedCredits);
        setLoading(false);
        Animated.parallel([
          Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: ND }),
          Animated.spring(contentSlide, { toValue: 0, speed: 14, bounciness: 4, useNativeDriver: ND }),
        ]).start();
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [personId]);

  // ── Tab switching ─────────────────────────────────────────────────────────
  const TAB_W = (SW - 32) / 2;
  const switchTab = useCallback((tab: 'movies' | 'tv') => {
    setActiveTab(tab);
    setSearchQuery('');
    Animated.spring(tabIndicatorX, {
      toValue: tab === 'movies' ? 0 : TAB_W,
      speed: 20,
      bounciness: 6,
      useNativeDriver: ND,
    }).start();
  }, [TAB_W, tabIndicatorX]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const allMovies = useMemo(() =>
    (credits?.cast ?? []).filter(c => c.media_type === 'movie'),
    [credits],
  );
  const allTV = useMemo(() =>
    (credits?.cast ?? []).filter(c => c.media_type === 'tv'),
    [credits],
  );

  // Top 6 by vote count for "Known For"
  const knownFor = useMemo(() => {
    const all = [...(credits?.cast ?? [])];
    return all
      .sort((a, b) => b.vote_count - a.vote_count)
      .slice(0, 6);
  }, [credits]);

  // Filtered list for active tab
  const filteredList = useMemo(() => {
    const base = activeTab === 'movies' ? allMovies : allTV;
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.character.toLowerCase().includes(q),
    );
  }, [activeTab, allMovies, allTV, searchQuery]);

  // ── Navigate to title ─────────────────────────────────────────────────────
  const openTitle = useCallback((credit: PersonCredit) => {
    navigation.navigate('MovieDetails', {
      movieId: String(credit.id),
      contentType: credit.media_type,
    });
  }, [navigation]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const profileSrc = person?.profile_path ?? initialProfilePath;

  const renderFilmCard = useCallback(({ item }: { item: PersonCredit }) => (
    <FilmCard credit={item} onPress={() => openTitle(item)} />
  ), [openTitle]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Sticky collapsed header (appears on scroll) ── */}
      <Animated.View
        style={[styles.stickyHeader, { opacity: headerOpacity }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.96)', 'rgba(0,0,0,0.85)']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
          {person?.name ?? initialName}
        </Text>
      </Animated.View>

      {/* ── Back button (always visible) ── */}
      <TouchableOpacity
        style={[styles.backBtn, { top: STATUS_BAR_H + 12 }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <View style={styles.backBtnInner}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </View>
      </TouchableOpacity>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: ND },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── ① Hero ── */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ scale: heroScale }], opacity: heroOpacity },
            ]}
          >
            {profileSrc ? (
              <Image
                source={{ uri: profileSrc }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.heroFallback]}>
                <Ionicons name="person-circle-outline" size={120} color={colors.textMuted} />
              </View>
            )}
          </Animated.View>

          {/* Multi-stop gradient: sides + strong bottom */}
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.55)', '#000']}
            locations={[0, 0.35, 0.72, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Name + department badge at hero bottom */}
          <View style={styles.heroBottom}>
            {person?.known_for_department && (
              <View style={styles.deptBadge}>
                <Ionicons name="star" size={10} color="#000" />
                <Text style={styles.deptBadgeText}>
                  {person.known_for_department.toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.heroName} numberOfLines={2}>
              {person?.name ?? initialName}
            </Text>
            {person?.also_known_as?.[0] && (
              <Text style={styles.heroAka} numberOfLines={1}>
                Also known as {person.also_known_as[0]}
              </Text>
            )}
          </View>
        </View>

        {/* ── Main content (fades in after load) ── */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={styles.loadingText}>Loading profile…</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}>

            {/* ── ② Stats row ── */}
            <View style={styles.statsRow}>
              <StatCard
                icon="person-outline"
                label="Age"
                value={person ? calcAge(person.birthday, person.deathday) : '—'}
              />
              <StatCard
                icon="calendar-outline"
                label="Birthday"
                value={person ? formatDate(person.birthday) : '—'}
              />
              <StatCard
                icon="location-outline"
                label="From"
                value={person?.place_of_birth ?? '—'}
              />
              <StatCard
                icon="flame-outline"
                label={person ? popularityLabel(person.popularity) : 'Popularity'}
                value={person ? person.popularity.toFixed(1) : '—'}
                gold
              />
            </View>

            {/* ── ③ Biography ── */}
            {!!person?.biography && (
              <View style={styles.bioSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.goldAccentBar} />
                  <Text style={styles.sectionTitle}>Biography</Text>
                </View>
                <Text
                  style={styles.bioText}
                  numberOfLines={bioExpanded ? undefined : 5}
                >
                  {person.biography}
                </Text>
                {person.biography.length > 280 && (
                  <TouchableOpacity
                    onPress={() => setBioExpanded(v => !v)}
                    style={styles.readMoreBtn}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.readMoreText}>
                      {bioExpanded ? 'Show less' : 'Read more'}
                    </Text>
                    <Ionicons
                      name={bioExpanded ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={colors.gold}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── ④ Known For ── */}
            {knownFor.length > 0 && (
              <View style={styles.knownForSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.goldAccentBar} />
                  <Text style={styles.sectionTitle}>Known For</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.knownForRow}
                >
                  {knownFor.map(c => (
                    <KnownForCard
                      key={`${c.media_type}-${c.id}`}
                      credit={c}
                      onPress={() => openTitle(c)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── ⑤ Works tabs ── */}
            <View style={styles.tabsSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.goldAccentBar} />
                <Text style={styles.sectionTitle}>Filmography</Text>
              </View>

              <View style={styles.tabBar}>
                {/* Animated gold indicator */}
                <Animated.View
                  style={[
                    styles.tabIndicator,
                    { width: TAB_W, transform: [{ translateX: tabIndicatorX }] },
                  ]}
                />

                <TouchableOpacity
                  style={[styles.tabBtn, { width: TAB_W }]}
                  onPress={() => switchTab('movies')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="film"
                    size={14}
                    color={activeTab === 'movies' ? '#000' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      activeTab === 'movies' && styles.tabBtnTextActive,
                    ]}
                  >
                    Movies
                  </Text>
                  <View style={[styles.countBadge, activeTab === 'movies' && styles.countBadgeActive]}>
                    <Text style={[styles.countBadgeText, activeTab === 'movies' && styles.countBadgeTextActive]}>
                      {allMovies.length}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, { width: TAB_W }]}
                  onPress={() => switchTab('tv')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="tv"
                    size={14}
                    color={activeTab === 'tv' ? '#000' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      activeTab === 'tv' && styles.tabBtnTextActive,
                    ]}
                  >
                    TV Shows
                  </Text>
                  <View style={[styles.countBadge, activeTab === 'tv' && styles.countBadgeActive]}>
                    <Text style={[styles.countBadgeText, activeTab === 'tv' && styles.countBadgeTextActive]}>
                      {allTV.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* ── ⑥ Search bar ── */}
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${activeTab === 'movies' ? 'movies' : 'TV shows'}…`}
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {!!searchQuery && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search result count */}
              {!!searchQuery && (
                <Text style={styles.searchResultCount}>
                  {filteredList.length} result{filteredList.length !== 1 ? 's' : ''} for "{searchQuery}"
                </Text>
              )}

              {/* ── ⑦ Filmography grid ── */}
              {filteredList.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="film-outline" size={44} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {searchQuery ? 'No matches found' : 'No titles yet'}
                  </Text>
                  {!!searchQuery && (
                    <Text style={styles.emptySubtitle}>Try a different search term</Text>
                  )}
                </View>
              ) : (
                <FlatList
                  data={filteredList}
                  keyExtractor={c => `${c.media_type}-${c.id}`}
                  renderItem={renderFilmCard}
                  numColumns={2}
                  columnWrapperStyle={styles.gridRow}
                  scrollEnabled={false}
                  contentContainerStyle={styles.gridContent}
                  removeClippedSubviews={false}
                />
              )}
            </View>

          </Animated.View>
        )}
      </Animated.ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },

  // Sticky header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: STATUS_BAR_H + 50,
    justifyContent: 'flex-end',
    paddingBottom: 10,
    paddingHorizontal: 60,
  },
  stickyHeaderTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },

  // Back button
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 100,
  },
  backBtnInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  // Scroll
  scrollContent: {
    paddingBottom: 60,
  },

  // Hero
  heroContainer: {
    width: SW,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroFallback: {
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBottom: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 6,
  },
  deptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.gold,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  deptBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  heroName: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    letterSpacing: -0.5,
    ...Platform.select({
      web: { textShadow: '0 2px 12px rgba(0,0,0,0.9)' } as object,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
      },
    }),
  },
  heroAka: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 14,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  goldAccentBar: {
    width: 4,
    height: 20,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  sectionTitle: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Biography
  bioSection: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 8,
  },
  bioText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  readMoreText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
  },

  // Known For
  knownForSection: {
    paddingTop: 22,
    paddingLeft: 18,
    paddingBottom: 8,
  },
  knownForRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 18,
  },

  // Works tabs
  tabsSection: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.gold,
    borderRadius: 13,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    zIndex: 1,
  },
  tabBtnText: {
    color: colors.textMuted,
    fontSize: 13.5,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#000',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  countBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  countBadgeTextActive: {
    color: '#000',
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 9,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  searchResultCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    paddingLeft: 2,
  },

  // Grid
  gridContent: {
    paddingTop: 4,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 12,
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
});

export default ActorProfileScreen;
