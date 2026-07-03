import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SERVERS, StreamingServer } from '../../api/streaming';

interface Props {
  visible: boolean;
  currentServerId: string;
  onSelect: (server: StreamingServer) => void;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

const ServerSelector: React.FC<Props> = ({
  visible,
  currentServerId,
  onSelect,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Streaming Servers</Text>
        <ScrollView>
          {SERVERS.map((server, index) => {
            const isActive = server.id === currentServerId;
            return (
              <TouchableOpacity
                key={server.id}
                style={[styles.row, isActive && styles.rowActive]}
                onPress={() => {
                  onSelect(server);
                  onClose();
                }}
              >
                <View style={styles.serverInfo}>
                  <View style={[styles.indexBadge, isActive && styles.indexBadgeActive]}>
                    <Text style={styles.indexText}>{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={[styles.serverName, isActive && styles.serverNameActive]}>
                      {server.name}
                    </Text>
                    <View style={styles.badges}>
                      {server.supportsSubtitles && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>CC</Text>
                        </View>
                      )}
                    </View>
                  </View>
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
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexBadgeActive: {
    backgroundColor: '#e50914',
  },
  indexText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  serverName: {
    color: '#ccc',
    fontSize: 15,
    fontWeight: '600',
  },
  serverNameActive: {
    color: '#fff',
  },
  badges: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  badge: {
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#aaa',
    fontSize: 10,
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

export default ServerSelector;
