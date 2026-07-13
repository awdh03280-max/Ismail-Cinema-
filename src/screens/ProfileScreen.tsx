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
import ProfileSignInPrompt from './ProfileSignInPrompt';

const ProfileScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [darkMode] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const { isEnabled, isUnlocked } = useFamilyMode();
  const { user, userProfile, logout, isLoading: authLoading } = useAuth();
  const { followersCount, followingCount } = useFollow();
  const { level, xp, xpProgress, xpToNextLevel, unlockedIds, allAchievements } = useXP();

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

          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{displayEmail}</Text>
        </View>

        {/* ── XP / Level / Achievements ────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.xpCard}
          onPress={() => navigation.navigate('AchievementsScreen')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#1a1200', '#0d0d0d']} style={styles.xpCardGradient}>
            <View style={styles.xpCardTop}>
              <View style={styles.levelBadge}>
                <Ionicons name="star" size={14} color="#000" />
                <Text style={styles.levelBadgeText}>Level {level}</Text>
              </View>
              <Text style={styles.xpText}>{xp} XP</Text>
            </View>

            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, { width: `${Math.round(xpProgress * 100)}%` }]} />
            </View>
            <Text style={styles.xpNextText}>{xpToNextLevel} XP to next level</Text>

            <View style={styles.xpCardDivider} />

            <View style={styles.achievementsRow}>
              <Ionicons name="trophy" size={18} color="#d4af37" />
              <Text style={styles.achievementsText}>
                {unlockedIds.size}/{allAchievements.length} Achievements Unlocked
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Menu ───────────────────────────────────────────────────────── */}
        <View style={styles.section}>
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
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          {/* My Watch Parties */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('WatchParty')}
            activeOpacity={0.75}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="people-circle" size={24} color="#e50914" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>My Watch Parties</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          {/* Followers */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('FollowersScreen', { uid: user?.uid ?? '', displayName })}
            activeOpacity={0.75}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="people" size={24} color="#e50914" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Followers</Text>
                <Text style={styles.settingValue}>{followersCount}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          {/* Following */}
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast]}
            onPress={() => navigation.navigate('FollowingScreen', { uid: user?.uid ?? '', displayName })}
            activeOpacity={0.75}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="person-add" size={24} color="#e50914" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Following</Text>
                <Text style={styles.settingValue}>{followingCount}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>
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
  profileName: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 4 },
  profileEmail: { fontSize: 13, color: '#999', marginTop: 4 },

  xpCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  xpCardGradient: { padding: 16 },
  xpCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#d4af37',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: { color: '#000', fontSize: 12, fontWeight: '800' },
  xpText: { color: '#d4af37', fontSize: 13, fontWeight: '700' },
  xpBarTrack: {
    height: 8, borderRadius: 4, backgroundColor: '#1e1e1e', overflow: 'hidden',
  },
  xpBarFill: { height: 8, borderRadius: 4, backgroundColor: '#d4af37' },
  xpNextText: { color: '#666', fontSize: 11, marginTop: 6 },
  xpCardDivider: { height: 1, backgroundColor: 'rgba(212,175,55,0.15)', marginVertical: 14 },
  achievementsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  achievementsText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },

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
