import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';

interface SocialButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
}

const SocialButton: React.FC<SocialButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
}) => (
  <TouchableOpacity
    style={[styles.btn, (disabled || loading) && styles.btnDisabled]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator size="small" color="#fff" />
    ) : (
      <View style={styles.inner}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={styles.label}>{label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e30',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    height: 52,
    paddingHorizontal: 20,
  },
  btnDisabled: { opacity: 0.5 },
  inner: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { marginRight: 10 },
  label: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

export default SocialButton;
