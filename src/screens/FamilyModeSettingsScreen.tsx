/**
 * FamilyModeSettingsScreen — configure and manage Family Mode.
 *
 * Accessible from Profile → Family Mode.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFamilyMode } from '../context/FamilyModeContext';

// ── Restriction rows ───────────────────────────────────────────────────────────

const RESTRICTIONS = [
  { icon: 'film-outline', key: 'fm_restrict_adult_movies' },
  { icon: 'tv-outline', key: 'fm_restrict_adult_shows' },
  { icon: 'eye-off-outline', key: 'fm_restrict_explicit' },
  { icon: 'lock-closed-outline', key: 'fm_restrict_pin' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

const FamilyModeSettingsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { isEnabled, isUnlocked, lock } = useFamilyMode();

  // ── Navigation helpers ──────────────────────────────────────────────────────

  const openPin = (mode: 'setup' | 'unlock' | 'disable' | 'change') =>
    navigation.navigate('FamilyModePin', { mode });

  const handleLock = () => {
    Alert.alert(t('fm_lock_title'), t('fm_lock_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('fm_lock_btn'), style: 'destructive', onPress: lock },
    ]);
  };

  // ── Derived state ───────────────────────────────────────────────────────────

  const statusIcon: any = isEnabled
    ? isUnlocked ? 'shield-checkmark' : 'shield'
    : 'shield-outline';
  const statusColor = isEnabled ? '#e50914' : '#555';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e27" />
      <LinearGradient
        colors={['#0a0e27', '#1a1a2e']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status card ─────────────────────────────────────────────────── */}
        <View style={styles.statusCard}>
          <LinearGradient
            colors={
              isEnabled
                ? ['rgba(229,9,20,0.15)', 'rgba(26,26,46,0.9)']
                : ['rgba(26,26,46,0.9)', 'rgba(10,14,39,0.9)']
            }
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.statusIconCircle, { borderColor: statusColor }]}>
            <Ionicons name={statusIcon} size={38} color={statusColor} />
          </View>

          <Text style={styles.statusTitle}>
            {isEnabled ? t('fm_status_on') : t('fm_status_off')}
          </Text>
          <Text style={styles.statusSub}>
            {isEnabled
              ? isUnlocked
                ? t('fm_status_unlocked')
                : t('fm_status_locked')
              : t('fm_status_off_sub')}
          </Text>

          {isEnabled && (
            <View
              style={[
                styles.badge,
                isUnlocked ? styles.badgeGreen : styles.badgeRed,
              ]}
            >
              <Ionicons
                name={isUnlocked ? 'lock-open-outline' : 'lock-closed-outline'}
                size={12}
                color="#fff"
              />
              <Text style={styles.badgeText}>
                {isUnlocked ? t('fm_unlocked_badge') : t('fm_locked_badge')}
              </Text>
            </View>
          )}
        </View>

        {/* ── Quick actions ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('fm_quick_actions')}</Text>

          {!isEnabled ? (
            /* Enable */
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => openPin('setup')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#e50914', '#b5060f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>{t('fm_enable')}</Text>
            </TouchableOpacity>
          ) : (
            <>
              {/* Unlock / Lock Now */}
              {isUnlocked ? (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleLock}
                  activeOpacity={0.8}
                >
                  <Ionicons name="lock-closed" size={18} color="#e50914" />
                  <Text style={[styles.secondaryBtnText, { color: '#e50914' }]}>
                    {t('fm_lock_now')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => openPin('unlock')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#e50914', '#b5060f']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name="lock-open" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>{t('fm_unlock')}</Text>
                </TouchableOpacity>
              )}

              {/* Change PIN */}
              <TouchableOpacity
                style={[styles.secondaryBtn, { marginTop: 10 }]}
                onPress={() => openPin('change')}
                activeOpacity={0.8}
              >
                <Ionicons name="key-outline" size={18} color="#fff" />
                <Text style={styles.secondaryBtnText}>{t('fm_change_pin')}</Text>
              </TouchableOpacity>

              {/* Disable */}
              <TouchableOpacity
                style={[styles.dangerBtn, { marginTop: 10 }]}
                onPress={() => openPin('disable')}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-outline" size={18} color="#e50914" />
                <Text style={[styles.secondaryBtnText, { color: '#e50914' }]}>
                  {t('fm_disable')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Content restrictions ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('fm_restrictions_title')}</Text>

          {RESTRICTIONS.map(({ icon, key }, i) => (
            <View
              key={key}
              style={[
                styles.restrictionRow,
                i === RESTRICTIONS.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.restrictionIconWrap}>
                <Ionicons name={icon as any} size={16} color="#e50914" />
              </View>
              <Text style={styles.restrictionText}>{t(key)}</Text>
              <Ionicons
                name={isEnabled ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={isEnabled ? '#e50914' : '#444'}
              />
            </View>
          ))}
        </View>

        {/* ── About ───────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('fm_about_title')}</Text>
          <Text style={styles.aboutText}>{t('fm_about_desc')}</Text>

          {/* PIN note */}
          <View style={styles.pinNote}>
            <Ionicons name="information-circle-outline" size={16} color="#888" />
            <Text style={styles.pinNoteText}>{t('fm_pin_note')}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e27' },
  scroll: { paddingBottom: 48, paddingTop: 8 },

  // Status card
  statusCard: {
    margin: 16,
    padding: 28,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
    overflow: 'hidden',
    minHeight: 170,
    justifyContent: 'center',
    gap: 6,
  },
  statusIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#0a0e27',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statusSub: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeRed: { backgroundColor: 'rgba(229,9,20,0.25)' },
  badgeGreen: { backgroundColor: 'rgba(30,180,30,0.2)' },
  badgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Section
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#111625',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e2040',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
  },

  // Primary action button
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Secondary action button
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    backgroundColor: '#0a0e27',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Danger button
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.35)',
    backgroundColor: 'rgba(229,9,20,0.07)',
  },

  // Restriction rows
  restrictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#0a0e27',
    gap: 12,
  },
  restrictionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(229,9,20,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restrictionText: { flex: 1, fontSize: 14, color: '#ddd' },

  // About
  aboutText: { fontSize: 13, color: '#888', lineHeight: 20 },
  pinNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#0a0e27',
    borderRadius: 8,
  },
  pinNoteText: { flex: 1, fontSize: 12, color: '#666', lineHeight: 17 },
});

export default FamilyModeSettingsScreen;
