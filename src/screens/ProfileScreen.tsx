import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18next from '../i18n/i18n';
import { setLanguage, getLanguage } from '../storage/storage';
import { useFamilyMode } from '../context/FamilyModeContext';

const ProfileScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [darkMode] = useState(true);
  const { isEnabled, isUnlocked } = useFamilyMode();

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#0a0e27');
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

  // Family Mode status label
  const fmStatusLabel = isEnabled
    ? isUnlocked
      ? t('fm_unlocked_badge')
      : t('fm_locked_badge')
    : t('fm_status_off');

  const fmStatusColor = isEnabled ? '#e50914' : '#666';
  const fmIcon: any = isEnabled
    ? isUnlocked ? 'shield-checkmark' : 'shield'
    : 'shield-outline';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0e27', '#1a1a2e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={60} color="#e50914" />
          </View>
          <Text style={styles.profileName}>Premium User</Text>
          <Text style={styles.profileEmail}>ismail.cinema@app.com</Text>
        </View>

        {/* Settings section */}
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
                style={[
                  styles.langButton,
                  currentLanguage === 'en' && styles.langButtonActive,
                ]}
                onPress={() => handleLanguageChange('en')}
              >
                <Text
                  style={[
                    styles.langButtonText,
                    currentLanguage === 'en' && styles.langButtonTextActive,
                  ]}
                >
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.langButton,
                  currentLanguage === 'ar' && styles.langButtonActive,
                ]}
                onPress={() => handleLanguageChange('ar')}
              >
                <Text
                  style={[
                    styles.langButtonText,
                    currentLanguage === 'ar' && styles.langButtonTextActive,
                  ]}
                >
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

          {/* ── Family Mode row ──────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast]}
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
                <View
                  style={[
                    styles.fmDot,
                    isUnlocked ? styles.fmDotGreen : styles.fmDotRed,
                  ]}
                />
              )}
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </View>
          </TouchableOpacity>
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>App Name</Text>
            <Text style={styles.aboutValue}>Ismail Cinema</Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>{t('version')}</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Developer</Text>
            <Text style={styles.aboutValue}>Ismail Cinema Team</Text>
          </View>
        </View>

        {/* Premium Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          {[
            'Ad-free experience',
            'Offline downloads',
            'Ultra HD streaming',
            'Multiple profiles',
          ].map(feat => (
            <View key={feat} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#e50914" />
              <Text style={styles.featureText}>{feat}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  scrollContent: { paddingBottom: 80 },

  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e50914',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  profileEmail: { fontSize: 14, color: '#999', marginTop: 4 },

  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },

  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  settingItemLast: { borderBottomWidth: 0 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingTextContainer: { marginLeft: 12, flex: 1 },
  settingLabel: { fontSize: 14, color: '#fff', fontWeight: '600' },
  settingValue: { fontSize: 12, color: '#999', marginTop: 2 },

  languageButtons: { flexDirection: 'row', gap: 8 },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#666',
  },
  langButtonActive: { backgroundColor: '#e50914', borderColor: '#e50914' },
  langButtonText: { fontSize: 12, color: '#999', fontWeight: '600' },
  langButtonTextActive: { color: '#fff' },

  fmDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fmDotRed: { backgroundColor: '#e50914' },
  fmDotGreen: { backgroundColor: '#2db52d' },

  aboutItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  aboutLabel: { fontSize: 12, color: '#999' },
  aboutValue: { fontSize: 14, color: '#fff', marginTop: 4, fontWeight: '600' },

  featureItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  featureText: { marginLeft: 12, color: '#fff', fontSize: 14 },
});

export default ProfileScreen;
