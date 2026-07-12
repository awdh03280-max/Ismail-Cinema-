import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18next from '../i18n/i18n';
import { setLanguage, getLanguage } from '../storage/storage';
import { useFamilyMode } from '../context/FamilyModeContext';
import { useAuth } from '../context/AuthContext';
import { useXP } from '../context/XPContext';
import { useFollow } from '../context/FollowContext';
import { useDailyReward } from '../hooks/useDailyReward';
import DailyRewardModal from '../components/DailyRewardModal';
import ProfileSignInPrompt from './ProfileSignInPrompt';

// Small inline components that safely call hooks inside provider tree

// ── XP Level Card ─────────────────────────────────────────────────────────────
const XPLevelCard: React.FC = () => {
  const { xp, level, xpInLevel, xpToNextLevel, xpProgress } = useXP();
  const isMaxLevel = level >= 150;

  return (
    <View style={xpStyles.card}>
      {/* Level badge + XP total */}
      <View style={xpStyles.topRow}>
        <View style={xpStyles.levelBadge}>
          <Text style={xpStyles.levelLabel}>LVL</Text>
          <Text style={xpStyles.levelNumber}>{level}</Text>
        </View>
        <View style={xpStyles.xpInfo}>
          <Text style={xpStyles.xpTotal}>{xp.toLocaleString()} XP</Text>
          <Text style={xpStyles.xpSub}>
            {isMaxLevel
              ? '✨ Max Level Reached'
              : `${xpInLevel} / 500 XP · ${xpToNextLevel} to Level ${level + 1}`}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={xpStyles.barTrack}>
        <View style={[xpStyles.barFill, { width: `${Math.round(xpProgress * 100)}%` as `${number}%` }]} />
      </View>
      <View style={xpStyles.barLabels}>
        <Text style={xpStyles.barLabelLeft}>Level {level}</Text>
        {!isMaxLevel && <Text style={xpStyles.barLabelRight}>Level {level + 1}</Text>}
      </View>
    </View>
  );
};

const xpStyles = StyleSheet.create({
  card: {
    width: '90%',
    backgroundColor: '#0d0d0d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 14,
    marginTop: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1000',
    borderWidth: 2,
    borderColor: '#d4af37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#d4af37',
    letterSpacing: 1,
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#d4af37',
    lineHeight: 22,
  },
  xpInfo: {
    flex: 1,
  },
  xpTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  xpSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e1e1e',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#d4af37',
    minWidth: 4,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  barLabelLeft: { fontSize: 10, color: '#555' },
  barLabelRight: { fontSize: 10, color: '#555' },
});

const AchievementsSummary: React.FC = () => {
  const { unlockedIds, allAchievements, level } = useXP();
  return (
    <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
      {unlockedIds.size}/{allAchievements.length} unlocked · Level {level}
    </Text>
  );
};

// Social stats row (followers / following tappable counters)
// Notification bell with unread badge
const NotificationIconWithBadge: React.FC = () => {
  const { unreadCount } = useFollow();
  return (
    <View style={{ position: 'relative', width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name="notifications-outline" size={24} color="#d4af37" />
      {unreadCount > 0 && (
        <View style={socialStyles.inlineBadge}>
          <Text style={socialStyles.inlineBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </View>
  );
};

const SocialStatsRow: React.FC<{ navigation: any; uid: string }> = ({ navigation, uid }) => {
  const { followersCount, followingCount, unreadCount } = useFollow();
  const { userProfile } = useAuth();
  const displayName = userProfile?.displayName ?? 'Cinema User';
  return (
    <View style={socialStyles.statsWrap}>
      <TouchableOpacity
        style={socialStyles.statBox}
        onPress={() => navigation.navigate('FollowersScreen', { uid, displayName })}
        activeOpacity={0.75}
      >
        <Text style={socialStyles.statCount}>{followersCount}</Text>
        <Text style={socialStyles.statLabel}>Followers</Text>
      </TouchableOpacity>
      <View style={socialStyles.statDivider} />
      <TouchableOpacity
        style={socialStyles.statBox}
        onPress={() => navigation.navigate('FollowingScreen', { uid, displayName })}
        activeOpacity={0.75}
      >
        <Text style={socialStyles.statCount}>{followingCount}</Text>
        <Text style={socialStyles.statLabel}>Following</Text>
      </TouchableOpacity>
      <View style={socialStyles.statDivider} />
      <TouchableOpacity
        style={socialStyles.statBox}
        onPress={() => navigation.navigate('NotificationsScreen')}
        activeOpacity={0.75}
      >
        <View style={socialStyles.bellWrap}>
          <Ionicons name="notifications-outline" size={22} color="#d4af37" />
          {unreadCount > 0 && (
            <View style={socialStyles.badge}>
              <Text style={socialStyles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>
        <Text style={socialStyles.statLabel}>Activity</Text>
      </TouchableOpacity>
    </View>
  );
};

const socialStyles = StyleSheet.create({
  statsWrap: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    overflow: 'hidden',
    width: '90%',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statCount: { fontSize: 20, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 10, color: '#666', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#1e1e1e', marginVertical: 8 },
  bellWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: '#e50914', borderRadius: 8,
    minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#000',
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  inlineBadge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: '#e50914', borderRadius: 7,
    minWidth: 14, height: 14,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 2, borderWidth: 1, borderColor: '#000',
  },
  inlineBadgeText: { fontSize: 8, color: '#fff', fontWeight: '800' },
});

const ProfileScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [darkMode] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);

  const { isEnabled, isUnlocked } = useFamilyMode();
  const { user, userProfile, logout, isLoading: authLoading } = useAuth();
  const dailyReward = useDailyReward();

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#000000');
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    const lang = await getLanguage();
    setCurrentLanguage(lang);
  };

  const handleLanguageChange = async (language: 'en' | 'ar') => {
    setCurrentLanguage(language);
    await setLanguage(language);
    await i18next.changeLanguage(language);
  };

  const handleLogout = () => {
    Alert.alert(
      t('sign_out_confirm_title'),
      t('sign_out_confirm_message'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('sign_out'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              await logout();
              // RootNavigator will switch to AuthStack automatically via onAuthStateChanged
            } catch {
              setLoggingOut(false);
              Alert.alert(t('error'), t('sign_out_error'));
            }
          },
        },
      ]
    );
  };

  // Family Mode status
  const fmStatusLabel = isEnabled
    ? isUnlocked ? t('fm_unlocked_badge') : t('fm_locked_badge')
    : t('fm_status_off');
  const fmStatusColor = isEnabled ? '#e50914' : '#666';
  const fmIcon = (isEnabled
    ? isUnlocked ? 'shield-checkmark' : 'shield'
    : 'shield-outline') as React.ComponentProps<typeof Ionicons>['name'];

  // User display info — prefer Firestore profile, fall back to Firebase Auth
  const displayName =
    userProfile?.displayName || user?.displayName || 'Cinema User';
  const displayEmail =
    userProfile?.email || user?.email || '';
  const isGoogleUser =
    userProfile?.provider === 'google' ||
    user?.providerData?.[0]?.providerId === 'google.com';

  // Avatar letter and photo
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || 'C';
  const photoURL = userProfile?.photoURL || user?.photoURL || null;

  // Not signed in — show sign-in options instead of profile data.
  // Browsing (Home/Search/Details/Player) never requires auth; only this
  // Profile tab gates on it, per product requirement.
  if (!authLoading && !user) {
    return <ProfileSignInPrompt navigation={navigation} />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0d0d0d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar header ──────────────────────────────────────────────── */}
        <View style={styles.profileHeader}>
          {photoURL ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoURL }} style={styles.photoImage} />
            </View>
          ) : (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </View>
          )}

          {/* Provider badge */}
          {isGoogleUser && (
            <View style={styles.providerBadge}>
              <Text style={styles.providerBadgeText}>G</Text>
              <Text style={styles.providerBadgeLabel}> Google</Text>
            </View>
          )}

          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{displayEmail}</Text>

          {/* XP level card */}
          <XPLevelCard />

          {/* Social stats row */}
          <SocialStatsRow navigation={navigation} uid={user?.uid ?? ''} />
        </View>

        {/* ── Settings ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings')}</Text>

          {/* Language */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="language" size={24} color="#e50914" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('language_setting')}</Text>
                <Text style={styles.settingValue}>
                  {currentLanguage === 'en' ? 'English' : 'العربية'}
                </Text>
              </View>
            </View>
            <View style={styles.languageButtons}>
              <TouchableOpacity
                style={[styles.langButton, currentLanguage === 'en' && styles.langButtonActive]}
                onPress={() => handleLanguageChange('en')}
              >
                <Text style={[styles.langButtonText, currentLanguage === 'en' && styles.langButtonTextActive]}>
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langButton, currentLanguage === 'ar' && styles.langButtonActive]}
                onPress={() => handleLanguageChange('ar')}
              >
                <Text style={[styles.langButtonText, currentLanguage === 'ar' && styles.langButtonTextActive]}>
                  AR
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dark Mode */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={24} color="#e50914" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('dark_mode')}</Text>
                <Text style={styles.settingValue}>Always On</Text>
              </View>
            </View>
            <Switch value={darkMode} disabled />
          </View>

          {/* Family Mode */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('FamilyModeSettings')}
            activeOpacity={0.75}
          >
            <View style={styles.settingLeft}>
              <Ionicons name={fmIcon} size={24} color={fmStatusColor} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('family_mode')}</Text>
                <Text style={[styles.settingValue, { color: fmStatusColor }]}>
                  {fmStatusLabel}
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              {isEnabled && (
                <View style={[styles.fmDot, isUnlocked ? styles.fmDotGreen : styles.fmDotRed]} />
              )}
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </View>
          </TouchableOpacity>

          {/* Favorites */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('FavoritesScreen')}
            activeOpacity={0.75}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="heart" size={24} color="#d4af37" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('favorites')}</Text>
                <Text style={styles.settingValue}>View your saved titles</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          {/* Achievements */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('AchievementsScreen')}
            activeOpacity={0.75}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="trophy" size={24} color="#d4af37" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Achievements</Text>
                <AchievementsSummary />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          {/* Cinema Quiz — اختبر ذاكرتك السينمائية */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('CinemaQuizScreen')}
            activeOpacity={0.75}
          >
            <View style={styles.settingLeft}>
              <View style={styles.dailyRewardIconWrap}>
                <Text style={styles.dailyRewardIconEmoji}>🧠</Text>
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>اختبر ذاكرتك السينمائية</Text>
                <Text style={styles.settingValue}>10 أسئلة يومياً من مشاهداتك</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          {/* Daily Reward — الصندوق اليومي */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setRewardModalVisible(true)}
            activeOpacity={0.75}
          >
            <View style={styles.settingLeft}>
              <View style={styles.dailyRewardIconWrap}>
                <Text style={styles.dailyRewardIconEmoji}>🎁</Text>
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>الصندوق اليومي</Text>
                <Text style={[styles.settingValue, dailyReward.canClaim && styles.rewardReadyText]}>
                  {dailyReward.canClaim
                    ? '✨ مكافأتك جاهزة! اضغط للفتح'
                    : `التالية خلال ${dailyReward.countdown}`}
                </Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              {dailyReward.canClaim && (
                <View style={styles.rewardReadyDot} />
              )}
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </View>
          </TouchableOpacity>

          {/* Social — Activity / Notifications */}
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast]}
            onPress={() => navigation.navigate('NotificationsScreen')}
            activeOpacity={0.75}
          >
            <View style={styles.settingLeft}>
              <NotificationIconWithBadge />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Activity</Text>
                <Text style={styles.settingValue}>Follow notifications</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>
        </View>

        {/* ── Account section ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account')}</Text>

          {/* Account info row */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="person-circle-outline" size={24} color="#e50914" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('signed_in_as')}</Text>
                <Text style={styles.settingValue} numberOfLines={1}>
                  {displayEmail}
                </Text>
              </View>
            </View>
          </View>

          {/* Auth provider row */}
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingLeft}>
              <Ionicons
                name={isGoogleUser ? 'logo-google' : 'mail-outline'}
                size={24}
                color="#e50914"
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('sign_in_method')}</Text>
                <Text style={styles.settingValue}>
                  {isGoogleUser ? 'Google' : 'Email & Password'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── About ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>{t('app_name_label')}</Text>
            <Text style={styles.aboutValue}>Ismail Cinema</Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>{t('version')}</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>{t('developer_label')}</Text>
            <Text style={styles.aboutValue}>{t('developer_value')}</Text>
          </View>
        </View>

        {/* ── Daily Reward Modal ─────────────────────────────────────────── */}
        <DailyRewardModal
          visible={rewardModalVisible}
          onClose={() => setRewardModalVisible(false)}
          onClaim={dailyReward.claimReward}
          canClaim={dailyReward.canClaim}
          countdown={dailyReward.countdown}
          claiming={dailyReward.claiming}
        />

        {/* ── Sign out ───────────────────────────────────────────────────── */}
        <View style={styles.signOutSection}>
          <TouchableOpacity
            style={[styles.signOutBtn, loggingOut && styles.signOutBtnDisabled]}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.8}
          >
            {loggingOut ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.signOutText}>{t('sign_out')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingBottom: 80 },

  profileHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  avatarContainer: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#e50914',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#ff2222',
    marginBottom: 8,
  },
  avatarLetter: {
    fontSize: 36, fontWeight: '900', color: '#fff',
  },
  photoContainer: {
    width: 88, height: 88, borderRadius: 44,
    marginBottom: 8, overflow: 'hidden',
    borderWidth: 3, borderColor: '#d4af37',
  },
  photoImage: {
    width: '100%', height: '100%',
  },
  providerBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e1e30', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 3,
    marginBottom: 6, borderWidth: 1, borderColor: '#2a2a3e',
  },
  providerBadgeText: { fontSize: 13, fontWeight: '800', color: '#4285F4' },
  providerBadgeLabel: { fontSize: 11, color: '#aaa' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 4 },
  profileEmail: { fontSize: 13, color: '#999', marginTop: 4 },

  section: {
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#333',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },

  settingItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
  },
  settingItemLast: { borderBottomWidth: 0 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingTextContainer: { marginLeft: 12, flex: 1 },
  settingLabel: { fontSize: 14, color: '#fff', fontWeight: '600' },
  settingValue: { fontSize: 12, color: '#999', marginTop: 2 },

  languageButtons: { flexDirection: 'row', gap: 8 },
  langButton: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1, borderColor: '#666',
  },
  langButtonActive: { backgroundColor: '#e50914', borderColor: '#e50914' },
  langButtonText: { fontSize: 12, color: '#999', fontWeight: '600' },
  langButtonTextActive: { color: '#fff' },

  fmDot: { width: 8, height: 8, borderRadius: 4 },
  fmDotRed: { backgroundColor: '#e50914' },
  fmDotGreen: { backgroundColor: '#2db52d' },

  // Daily Reward card
  dailyRewardIconWrap: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyRewardIconEmoji: {
    fontSize: 22,
  },
  rewardReadyText: {
    color: '#d4af37',
    fontWeight: '700',
  },
  rewardReadyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d4af37',
    marginRight: 4,
  },

  aboutItem: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
  },
  aboutLabel: { fontSize: 12, color: '#999' },
  aboutValue: { fontSize: 14, color: '#fff', marginTop: 4, fontWeight: '600' },

  signOutSection: { padding: 24 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#e50914', borderRadius: 12,
    height: 52,
  },
  signOutBtnDisabled: { opacity: 0.6 },
  signOutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ProfileScreen;
