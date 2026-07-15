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
import { useFollow } from '../context/FollowContext';
import { useXP } from '../context/XPContext';
import { colors } from '../theme/colors';
import ProfileSignInPrompt from './ProfileSignInPrompt';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const ProfileScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [darkMode] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [favoritesPublic, setFavoritesPublic] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const { isEnabled, isUnlocked } = useFamilyMode();
  const { user, userProfile, logout, isLoading: authLoading } = useAuth();
  const { followersCount, followingCount } = useFollow();
  const { level, xp, xpProgress, xpToNextLevel, unlockedIds, allAchievements } = useXP();

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#000000');
    loadLanguage();
  }, []);

  // Load privacy settings from Firestore whenever auth state resolves
  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, 'users', user.uid);
    getDoc(ref).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setFavoritesPublic(data?.privacySettings?.favoritesPublic !== false);
    }).catch(() => {});
  }, [user?.uid]);

  const handleToggleFavoritesPrivacy = async () => {
    if (!user?.uid) return;
    const newVal = !favoritesPublic;
    setFavoritesPublic(newVal);
    setSavingPrivacy(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { privacySettings: { favoritesPublic: newVal } },
        { merge: true },
      );
    } catch {
      setFavoritesPublic(!newVal); // revert on error
    } finally {
      setSavingPrivacy(false);
    }
  };

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
  const fmStatusColor = isEnabled ? colors.red : '#666';
  const fmIcon = (isEnabled
    ? isUnlocked ? 'shield-checkmark' : 'shield'
    : 'shield-outline') as React.ComponentProps<typeof Ionicons>['name'];

  // User display info — prefer Firestore profile, fall back to Firebase Auth
  const displayName =
    userProfile?.displayName || user?.displayName || 'Cinema User';
  const displayEmail =
    userProfile?.email || user?.email || '';

  // Avatar letter and photo
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || 'C';
  const photoURL = userProfile?.photoURL || user?.photoURL || null;

  // Not signed in — show sign-in options instead of profile data.
  // Browsing (Home/Search/Details/Player) never requires auth; only this
  // Profile tab gates on it, per product requirement. No favorites, social,
  // or settings data is fetched or rendered until `user` exists.
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
        {/* ── Identity header ────────────────────────────────────────────── */}
        <View style={styles.identityCard}>
          <View style={styles.avatarRing}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.photoImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              </View>
            )}
          </View>

          <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
          {!!displayEmail && (
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.profileEmail} numberOfLines={1}>{displayEmail}</Text>
            </View>
          )}

          <View style={styles.levelPill}>
            <Ionicons name="star" size={12} color="#000" />
            <Text style={styles.levelPillText}>Level {level} · {xp} XP</Text>
          </View>
        </View>

        {/* ── Quick stats: Favorites / Followers / Following ──────────────── */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('FavoritesScreen')}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={20} color={colors.gold} />
            <Text style={styles.statLabel}>{t('favorites')}</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('FollowersScreen', { uid: user?.uid ?? '', displayName })}
            activeOpacity={0.8}
          >
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('FollowingScreen', { uid: user?.uid ?? '', displayName })}
            activeOpacity={0.8}
          >
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* ── XP / Achievements ────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.xpCard}
          onPress={() => navigation.navigate('AchievementsScreen')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#1a1200', '#0d0d0d']} style={styles.xpCardGradient}>
            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, { width: `${Math.round(xpProgress * 100)}%` }]} />
            </View>
            <View style={styles.xpMetaRow}>
              <Text style={styles.xpNextText}>{xpToNextLevel} XP to next level</Text>
              <View style={styles.achievementsRow}>
                <Ionicons name="trophy" size={15} color={colors.gold} />
                <Text style={styles.achievementsText}>
                  {unlockedIds.size}/{allAchievements.length} Achievements
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#555" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Settings ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings')}</Text>

          <View style={styles.card}>
            {/* Language */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name="language" size={20} color={colors.red} />
                </View>
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
                <View style={styles.settingIconWrap}>
                  <Ionicons name="moon" size={20} color={colors.red} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>{t('dark_mode')}</Text>
                  <Text style={styles.settingValue}>Always On</Text>
                </View>
              </View>
              <Switch value={darkMode} disabled trackColor={{ true: colors.red, false: '#444' }} />
            </View>

            {/* Family Mode */}
            <TouchableOpacity
              style={[styles.settingItem, styles.settingItemLast]}
              onPress={() => navigation.navigate('FamilyModeSettings')}
              activeOpacity={0.75}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name={fmIcon} size={20} color={fmStatusColor} />
                </View>
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
          </View>
        </View>

        {/* ── Privacy ────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.card}>
            <View style={[styles.settingItem, styles.settingItemLast]}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name="heart" size={20} color={colors.gold} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>Public Favorites</Text>
                  <Text style={styles.settingValue}>
                    {favoritesPublic ? 'Visible to everyone' : 'Only visible to you'}
                  </Text>
                </View>
              </View>
              <Switch
                value={favoritesPublic}
                onValueChange={handleToggleFavoritesPrivacy}
                disabled={savingPrivacy}
                trackColor={{ true: colors.gold, false: '#444' }}
                thumbColor={favoritesPublic ? '#000' : '#888'}
              />
            </View>
          </View>
        </View>

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

  identityCard: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: colors.gold,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  avatarFallback: {
    width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.red,
  },
  avatarLetter: {
    fontSize: 36, fontWeight: '900', color: '#fff',
  },
  photoImage: {
    width: '100%', height: '100%',
  },
  profileName: { fontSize: 21, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  emailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 5,
  },
  profileEmail: { fontSize: 13, color: colors.textSecondary },
  levelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.gold,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14,
    marginTop: 14,
  },
  levelPillText: { color: '#000', fontSize: 12, fontWeight: '800' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
  },
  statCard: { flex: 1, alignItems: 'center', gap: 6 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  statNumber: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  xpCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  xpCardGradient: { padding: 16 },
  xpBarTrack: {
    height: 6, borderRadius: 3, backgroundColor: '#1e1e1e', overflow: 'hidden',
  },
  xpBarFill: { height: 6, borderRadius: 3, backgroundColor: colors.gold },
  xpMetaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10,
  },
  xpNextText: { color: '#777', fontSize: 11 },
  achievementsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  achievementsText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  section: {
    paddingHorizontal: 16, paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: colors.textSecondary,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 10, marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },

  settingItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  settingItemLast: { borderBottomWidth: 0 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
  },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingTextContainer: { marginLeft: 12, flex: 1 },
  settingLabel: { fontSize: 14, color: '#fff', fontWeight: '600' },
  settingValue: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  languageButtons: { flexDirection: 'row', gap: 8 },
  langButton: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#555',
  },
  langButtonActive: { backgroundColor: colors.red, borderColor: colors.red },
  langButtonText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  langButtonTextActive: { color: '#fff' },

  fmDot: { width: 8, height: 8, borderRadius: 4 },
  fmDotRed: { backgroundColor: colors.red },
  fmDotGreen: { backgroundColor: '#2db52d' },

  signOutSection: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 12 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.red, borderRadius: 14,
    height: 52,
  },
  signOutBtnDisabled: { opacity: 0.6 },
  signOutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ProfileScreen;
