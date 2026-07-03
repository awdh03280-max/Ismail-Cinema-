import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUBTITLE_LANGUAGES, SubtitleLanguage } from '../../api/streaming';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  currentCode: string;
  onSelect: (lang: SubtitleLanguage) => void;
  onClose: () => void;
}

const SubtitleSelector: React.FC<Props> = ({
  visible,
  currentCode,
  onSelect,
  onClose,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>
          {isArabic ? 'الترجمة' : 'Subtitles'}
        </Text>
        <Text style={styles.subtitle}>
          {isArabic
            ? 'متوفرة عند دعم الخادم'
            : 'Available when supported by the server'}
        </Text>
        <ScrollView>
          {SUBTITLE_LANGUAGES.map((lang) => {
            const isActive = lang.code === currentCode;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => {
                  onSelect(lang);
                  onClose();
                }}
              >
                <View style={styles.left}>
                  <Ionicons
                    name={lang.code === 'off' ? 'close-circle' : 'text'}
                    size={18}
                    color={isActive ? '#e50914' : '#666'}
                  />
                  <Text style={[styles.label, isActive && styles.labelActive]}>
                    {isArabic ? lang.labelAr : lang.label}
                  </Text>
                </View>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={22} color="#e50914" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>
            {isArabic ? 'إغلاق' : 'Close'}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
    fontSize: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
  },
  rowActive: {
    backgroundColor: 'rgba(229,9,20,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229,9,20,0.4)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    color: '#ccc',
    fontSize: 15,
    fontWeight: '500',
  },
  labelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: 16,
    backgroundColor: '#222',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default SubtitleSelector;
