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
import { QUALITIES, Quality } from '../../api/streaming';

interface Props {
  visible: boolean;
  currentQuality: Quality;
  onSelect: (quality: Quality) => void;
  onClose: () => void;
}

const QUALITY_LABELS: Record<Quality, string> = {
  auto: 'Auto (Best Available)',
  '1080p': '1080p HD',
  '720p': '720p HD',
  '480p': '480p SD',
  '360p': '360p Low',
};

const QualitySelector: React.FC<Props> = ({
  visible,
  currentQuality,
  onSelect,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Video Quality</Text>
        <Text style={styles.subtitle}>
          Quality depends on server availability
        </Text>
        <ScrollView>
          {QUALITIES.map((q) => {
            const isActive = q === currentQuality;
            return (
              <TouchableOpacity
                key={q}
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => {
                  onSelect(q);
                  onClose();
                }}
              >
                <View style={styles.left}>
                  <Ionicons
                    name={q === 'auto' ? 'star-outline' : 'film-outline'}
                    size={18}
                    color={isActive ? '#e50914' : '#666'}
                  />
                  <Text style={[styles.label, isActive && styles.labelActive]}>
                    {QUALITY_LABELS[q]}
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
          <Text style={styles.closeBtnText}>Close</Text>
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

export default QualitySelector;
