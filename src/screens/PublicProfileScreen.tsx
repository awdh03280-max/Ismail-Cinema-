/**
 * PublicProfileScreen — another user's public profile.
 *
 * Shows: avatar, level/XP bar, follow/unfollow, mutual indicator, stat chips
 * (followers, following, movies, episodes, ratings, comments), join date,
 * last active, and three tabs: Favorites | Rated Movies | Rated TV.
 *
 * All data is live via Firestore onSnapshot listeners.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
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
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useFollow, fetchFollowingIds } from '../context/FollowContext';
import FollowButton from '../components/FollowButton';
import StarRating from '../components/StarRating';
import {
  subscribeUserPublicData,
  subscribeUserFavorites,
  subscribeUserRatings,
  UserPublicData,
  UserRating,
} from '../api/userContent';
import type { FavoriteMovie } from '../storage/storage';
import {
  xpLevelProgress,
  xpToNextLevelAmount,
  xpToLevel,
} from '../data/achievements';
import { colors } from '../theme/colors';
import { ND } from '../utils/animation';

const SW = Dimensions.get('window').width;
const POSTER_W = (SW - 52) / 2;
const TAB_LABELS = ['Favorites', 'Movies ★', 'TV ★'] as const;
type TabKey = 'favorites' | 'movies' | 'tv';
const TAB_KEYS: TabKey[] = ['favorites', 'movies', 'tv'];
const TAB_W = (SW - 32) / 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatJoinDate(createdAt: Timestamp | number | null | undefined): string {
  if (!createdAt) return '—';
  try {
    let date: Date;
    if (typeof createdAt === 'number') {
      date = new Date(createdAt);
    } else if (typeof (createdAt as any).toDate === 'function') {
      date = (createdAt as any).toDate();
    } else if (typeof (createdAt as any).seconds === 'number') {
      date = new Date((createdAt as any).seconds * 1000);
    } else {
      return '—';
    }
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return '—';
  }
}

function formatLastActive(ts: number | null | undefined): string {
  if (!ts) return 'Recently';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StatBox: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  value: number;
  label: string;
  onPress?: () => void;
}> = ({ icon, iconColor = colors.gold, value, label, onPress }) => (
  <TouchableOpacity
    style={styles.statBox}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.75 : 1}
  >
    <Ionicons name={icon} size={18} color={iconColor} />
    <Text style={styles.statValue}>{value.toLocaleString()}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const PosterCard: React.FC<{
  poster: string;
  title: string;
  year?: string;
  rating?: number;
  contentType?: string;
  onPress: () => void;
}> = ({ poster, title, year, rating, contentType, onPress }) => {
  const uri = poster
    ? poster.startsWith('http')
      ? poster
      : `https://image.tmdb.org/t/p/w342${poster}`
    : null;

  return (
    <TouchableOpacity style={styles.posterCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.posterImageWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.posterImage} resizeMode="cover" />
        ) : (
          <View style={[styles.posterImage, styles.posterPlaceholder]}>
            <Ionicons name="film-outline" size={28} color="#333" />
          </View>
        )}
        {contentType && (
          <View style={styles.contentTypeBadge}>
            <Text style={styles.contentTypeBadgeText}>
              {contentType === 'tv' ? 'TV' : 'MOV'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.posterInfo}>
        <Text style={styles.posterTitle} numberOfLines={2}>{title}</Text>
        {year ? <Text style={styles.posterYear}>{year}</Text> : null}
        {typeof rating === 'number' && rating > 0 && (
          <View style={styles.ratingRow}>
            <StarRating rating={rating} size={12} readOnly />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

interface Props {
  route: { params: { uid: string; displayName: string; photoURL?: string | null } };
  navigation: any;
}

const PublicProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { uid, displayName: initialName, photoURL: initialPhoto } = route.params;
  const { user } = useAuth();
  const { isFollowing } = useFollow();

  // Live data
  const [userData, setUserData] = useState<UserPublicData | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [theyFollowMe, setTheyFollowMe] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('favorites');
  const tabX = useRef(new Animated.Value(0)).current;

  // Hero animations
  const heroFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(16)).current;
  const xpBarWidth = useRef(new Animated.Value(0)).current;

  // Derived
  const isSelf = user?.uid === uid;
  const amFollowing = isFollowing(uid);
  const isMutual = amFollowing && theyFollowMe;
  const displayName = userData?.displayName ?? initialName;
  const photoURL = (userData?.photoURL !== undefined ? userData.photoURL : initialPhoto) ?? null;
  const privacyPublic = userData?.privacySettings?.favoritesPublic !== false;

  const xp = userData?.xp ?? 0;
  const level = userData?.level ?? xpToLevel(xp);
  const xpProgress = xpLevelProgress(xp);
  const xpLeft = xpToNextLevelAmount(xp);

  const movieRatings = useMemo(
    () => ratings.filter((r) => r.contentType === 'movie'),
    [ratings],
  );
  const tvRatings = useMemo(
    () => ratings.filter((r) => r.contentType === 'tv'),
    [ratings],
  );

  // ── Listeners ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (Platform.OS === 'android') StatusBar.setBackgroundColor('#000');
    StatusBar.setBarStyle('light-content');

    const unsubs: (() => void)[] = [];

    // User doc (stats + privacy)
    const unsubUser = subscribeUserPublicData(uid, (data) => {
      setUserData(data);
      setLoading(false);
      Animated.parallel([
        Animated.timing(heroFade, { toValue: 1, duration: 400, useNativeDriver: ND }),
        Animated.timing(headerSlide, { toValue: 0, duration: 400, useNativeDriver: ND }),
        Animated.timing(contentFade, { toValue: 1, duration: 500, delay: 120, useNativeDriver: ND }),
      ]).start();
    });
    unsubs.push(unsubUser);

    // Followers count — all docs where followingId == uid
    const unsubFollowers = onSnapshot(
      query(collection(db, 'follows'), where('followingId', '==', uid)),
      (snap) => setFollowersCount(snap.size),
    );
    unsubs.push(unsubFollowers);

    // Following count — all docs where followerId == uid
    const unsubFollowing = onSnapshot(
      query(collection(db, 'follows'), where('followerId', '==', uid)),
      (snap) => setFollowingCount(snap.size),
    );
    unsubs.push(unsubFollowing);

    // Does this user follow the current user? (for "mutual" / "follows you" badges)
    if (user?.uid) {
      const unsubMutual = onSnapshot(
        query(
          collection(db, 'follows'),
          where('followerId', '==', uid),
          where('followingId', '==', user.uid),
        ),
        (snap) => setTheyFollowMe(snap.size > 0),
      );
      unsubs.push(unsubMutual);
    }

    // Favorites subcollection
    const unsubFavs = subscribeUserFavorites(uid, setFavorites);
    unsubs.push(unsubFavs);

    // Ratings collection
    const unsubRatings = subscribeUserRatings(uid, setRatings);
    unsubs.push(unsubRatings);

    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, user?.uid]);

  // Animate XP bar whenever xpProgress changes
  useEffect(() => {
    Animated.timing(xpBarWidth, {
      toValue: xpProgress,
      duration: 600,
      delay: 300,
      useNativeDriver: false, // width is a layout prop
    }).start();
  }, [xpProgress]);

  // ── Tab switch ────────────────────────────────────────────────────────────

  const switchTab = useCallback(
    (tab: TabKey, index: number) => {
      setActiveTab(tab);
      Animated.spring(tabX, {
        toValue: index * TAB_W,
        speed: 22,
        bounciness: 5,
        useNativeDriver: ND,
      }).start();
    },
    [tabX],
  );

  // ── Card press ────────────────────────────────────────────────────────────

  const openTitle = (movieId: string, contentType: string) => {
    navigation.navigate('MovieDetails', { movieId, contentType });
  };

  // ── Renders ───────────────────────────────────────────────────────────────

  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || '?';

  const renderFavoriteItem = useCallback(
    ({ item }: { item: FavoriteMovie }) => (
      <PosterCard
        poster={item.poster}
        title={item.title}
        contentType={item.contentType}
        onPress={() => openTitle(item.imdbID, item.contentType ?? 'movie')}
      />
    ),
    [],
  );

  const renderRatingItem = useCallback(
    ({ item }: { item: UserRating }) => (
      <PosterCard
        poster={item.poster}
        title={item.title}
        rating={item.rating}
        onPress={() => openTitle(item.movieId, item.contentType)}
      />
    ),
    [],
  );

  // ── Private favorites placeholder ─────────────────────────────────────────

  const renderPrivateFavorites = () => (
    <View style={styles.privateBanner}>
      <View style={styles.privateIconWrap}>
        <Ionicons name="lock-closed" size={32} color={colors.gold} />
      </View>
      <Text style={styles.privateTitle}>Favorites are private</Text>
      <Text style={styles.privateSubtitle}>
        This user has chosen to keep their favorites hidden.
      </Text>
    </View>
  );

  const renderEmpty = (label: string) => (
    <View style={styles.emptyContent}>
      <Ionicons name="film-outline" size={36} color="#333" />
      <Text style={styles.emptyText}>No {label} yet</Text>
    </View>
  );

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0a0a0a', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      {/* Back button (floating over hero) */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Hero card ─────────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.heroCard,
            { opacity: heroFade, transform: [{ translateY: headerSlide }] },
          ]}
        >
          <LinearGradient
            colors={['rgba(212,175,55,0.08)', 'rgba(0,0,0,0)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarRing, isMutual && styles.avatarRingMutual]}>
              {photoURL ? (
                <Image
                  source={{ uri: photoURL }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>{avatarLetter}</Text>
                </View>
              )}
            </View>
            {/* Level badge */}
            <View style={styles.levelBadge}>
              <Ionicons name="star" size={9} color="#000" />
              <Text style={styles.levelBadgeText}>{level}</Text>
            </View>
          </View>

          {/* Name */}
          <Text style={styles.heroName} numberOfLines={1}>{displayName}</Text>

          {/* Social tags */}
          <View style={styles.tagsRow}>
            {isMutual && (
              <View style={[styles.tag, styles.tagMutual]}>
                <Ionicons name="people" size={11} color="#000" />
                <Text style={styles.tagTextDark}>Mutual</Text>
              </View>
            )}
            {theyFollowMe && !isMutual && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>Follows you</Text>
              </View>
            )}
          </View>

          {/* XP bar */}
          <View style={styles.xpRow}>
            <Text style={styles.xpLabel}>Level {level}</Text>
            <View style={styles.xpTrack}>
              <Animated.View
                style={[
                  styles.xpFill,
                  {
                    width: xpBarWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.xpRight}>{xpLeft} XP left</Text>
          </View>

          {/* Follow/Unfollow button */}
          {!isSelf && (
            <View style={styles.followBtnWrap}>
              <FollowButton
                targetUid={uid}
                targetDisplayName={displayName}
                targetPhotoURL={photoURL}
                isMutual={isMutual}
                size="md"
              />
            </View>
          )}
        </Animated.View>

        {/* ── Stats grid ───────────────────────────────────────────────── */}
        <Animated.View
          style={[styles.statsGrid, { opacity: contentFade }]}
        >
          <StatBox
            icon="people"
            value={followersCount}
            label="Followers"
            onPress={() =>
              navigation.navigate('FollowersScreen', { uid, displayName })
            }
          />
          <View style={styles.statDivider} />
          <StatBox
            icon="person-add"
            value={followingCount}
            label="Following"
            onPress={() =>
              navigation.navigate('FollowingScreen', { uid, displayName })
            }
          />
          <View style={styles.statDivider} />
          <StatBox
            icon="film"
            iconColor={colors.red}
            value={userData?.moviesWatched ?? 0}
            label="Movies"
          />
          <View style={styles.statSeparator} />
          <StatBox
            icon="tv"
            iconColor="#7c7cff"
            value={userData?.episodesWatched ?? 0}
            label="Episodes"
          />
          <View style={styles.statDivider} />
          <StatBox
            icon="star"
            value={userData?.ratingsCount ?? 0}
            label="Ratings"
          />
          <View style={styles.statDivider} />
          <StatBox
            icon="chatbubble"
            iconColor="#2db52d"
            value={userData?.commentsCount ?? 0}
            label="Comments"
          />
        </Animated.View>

        {/* ── Meta strip ───────────────────────────────────────────────── */}
        <Animated.View style={[styles.metaStrip, { opacity: contentFade }]}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              Joined {formatJoinDate(userData?.createdAt)}
            </Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              Active {formatLastActive(userData?.lastActive)}
            </Text>
          </View>
        </Animated.View>

        {/* ── Mutual banner ─────────────────────────────────────────────── */}
        {isMutual && (
          <Animated.View style={[styles.mutualBanner, { opacity: contentFade }]}>
            <LinearGradient
              colors={['rgba(212,175,55,0.12)', 'rgba(212,175,55,0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mutualBannerGrad}
            >
              <Ionicons name="people" size={16} color={colors.gold} />
              <Text style={styles.mutualBannerText}>
                You and {displayName.split(' ')[0]} follow each other
              </Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ── Tab bar ───────────────────────────────────────────────────── */}
        <Animated.View style={[styles.tabBarWrap, { opacity: contentFade }]}>
          <View style={styles.tabBar}>
            {TAB_KEYS.map((key, i) => (
              <TouchableOpacity
                key={key}
                style={styles.tabItem}
                onPress={() => switchTab(key, i)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === key && styles.tabTextActive,
                  ]}
                >
                  {TAB_LABELS[i]}
                </Text>
              </TouchableOpacity>
            ))}
            {/* Animated indicator */}
            <Animated.View
              style={[
                styles.tabIndicator,
                { transform: [{ translateX: tabX }] },
              ]}
            />
          </View>
        </Animated.View>

        {/* ── Tab content ───────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: contentFade }}>
          {/* FAVORITES */}
          {activeTab === 'favorites' && (
            !privacyPublic && !isSelf
              ? renderPrivateFavorites()
              : favorites.length === 0
              ? renderEmpty('favorites')
              : (
                <FlatList
                  data={favorites}
                  keyExtractor={(item) => item.imdbID}
                  numColumns={2}
                  scrollEnabled={false}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={styles.gridContent}
                  renderItem={renderFavoriteItem}
                />
              )
          )}

          {/* RATED MOVIES */}
          {activeTab === 'movies' && (
            movieRatings.length === 0
              ? renderEmpty('rated movies')
              : (
                <FlatList
                  data={movieRatings}
                  keyExtractor={(item) => item.movieId}
                  numColumns={2}
                  scrollEnabled={false}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={styles.gridContent}
                  renderItem={renderRatingItem}
                />
              )
          )}

          {/* RATED TV */}
          {activeTab === 'tv' && (
            tvRatings.length === 0
              ? renderEmpty('rated TV shows')
              : (
                <FlatList
                  data={tvRatings}
                  keyExtractor={(item) => item.movieId}
                  numColumns={2}
                  scrollEnabled={false}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={styles.gridContent}
                  renderItem={renderRatingItem}
                />
              )
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scrollContent: { paddingBottom: 100 },

  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 16,
    zIndex: 10,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Hero card
  heroCard: {
    marginTop: Platform.OS === 'ios' ? 100 : 80,
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    backgroundColor: 'rgba(20,16,0,0.6)',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },

  // Avatar
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarRing: {
    width: 96, height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: colors.gold,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  avatarRingMutual: {
    borderColor: colors.gold,
    ...Platform.select({
      default: {
        shadowColor: colors.gold,
        shadowOpacity: 0.6,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
      },
    }),
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.red,
  },
  avatarLetter: { fontSize: 38, fontWeight: '900', color: '#fff' },
  levelBadge: {
    position: 'absolute',
    bottom: 0, right: -4,
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 3,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    borderWidth: 1.5, borderColor: '#000',
  },
  levelBadgeText: { fontSize: 11, fontWeight: '900', color: '#000' },

  // Name + tags
  heroName: {
    fontSize: 22, fontWeight: '800', color: '#fff',
    letterSpacing: 0.2, textAlign: 'center',
  },
  tagsRow: {
    flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 4,
    flexWrap: 'wrap', justifyContent: 'center',
  },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  tagMutual: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  tagText: { fontSize: 12, color: '#ccc', fontWeight: '600' },
  tagTextDark: { fontSize: 12, color: '#000', fontWeight: '700' },

  // XP bar
  xpRow: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    gap: 8, marginTop: 16, marginBottom: 4,
  },
  xpLabel: { fontSize: 11, color: colors.gold, fontWeight: '700', minWidth: 52 },
  xpTrack: {
    flex: 1, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(212,175,55,0.15)', overflow: 'hidden',
  },
  xpFill: { height: 5, borderRadius: 3, backgroundColor: colors.gold },
  xpRight: {
    fontSize: 10, color: colors.textSecondary, minWidth: 68, textAlign: 'right',
  },

  // Follow button
  followBtnWrap: { marginTop: 16 },

  // Stats grid
  statsGrid: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: colors.surfaceCard,
    borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', flexWrap: 'wrap',
    paddingVertical: 4,
  },
  statBox: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 18, gap: 4,
  },
  statDivider: { width: 1, backgroundColor: colors.border },
  statSeparator: {
    width: '100%', height: 1, backgroundColor: colors.border,
  },
  statValue: { fontSize: 17, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },

  // Meta strip
  metaStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginTop: 14,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#333' },
  metaText: { fontSize: 12, color: colors.textSecondary },

  // Mutual banner
  mutualBanner: { marginHorizontal: 16, marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  mutualBannerGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)', borderRadius: 14,
  },
  mutualBannerText: { fontSize: 13, color: colors.gold, fontWeight: '600', flex: 1 },

  // Tab bar
  tabBarWrap: {
    marginHorizontal: 16, marginTop: 22,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    height: 44,
    position: 'relative',
  },
  tabItem: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    zIndex: 2,
  },
  tabText: {
    fontSize: 12, fontWeight: '700',
    color: colors.textSecondary, letterSpacing: 0.3,
  },
  tabTextActive: { color: '#000' },
  tabIndicator: {
    position: 'absolute',
    bottom: 5, top: 5,
    width: TAB_W,
    left: 0,
    backgroundColor: colors.gold,
    borderRadius: 12,
    zIndex: 1,
  },

  // Grid content
  gridContent: { paddingTop: 16, paddingHorizontal: 16 },
  gridRow: { justifyContent: 'space-between', marginBottom: 16 },

  // Poster card
  posterCard: { width: POSTER_W },
  posterImageWrap: {
    width: POSTER_W,
    height: POSTER_W * 1.5,
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  posterImage: { width: '100%', height: '100%' },
  posterPlaceholder: {
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#111',
  },
  contentTypeBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6,
  },
  contentTypeBadgeText: { fontSize: 9, fontWeight: '800', color: colors.gold },
  posterInfo: { marginTop: 6, paddingHorizontal: 2 },
  posterTitle: { fontSize: 12, fontWeight: '700', color: '#fff', lineHeight: 16 },
  posterYear: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  ratingRow: { marginTop: 4 },

  // Empty / Private states
  emptyContent: {
    alignItems: 'center', paddingTop: 60, paddingBottom: 40, gap: 12,
  },
  emptyText: { fontSize: 14, color: '#444', fontWeight: '600' },

  privateBanner: {
    alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12,
  },
  privateIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(212,175,55,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
  },
  privateTitle: { fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' },
  privateSubtitle: {
    fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19,
  },
});

export default PublicProfileScreen;
