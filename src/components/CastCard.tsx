import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface CastCardProps {
  name: string;
  role?: string;
  profilePath: string | null;
}

const CastCard: React.FC<CastCardProps> = ({ name, role, profilePath }) => {
  return (
    <View style={styles.card}>
      <View style={styles.avatarWrap}>
        {profilePath ? (
          <Image source={{ uri: profilePath }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={28} color={colors.textMuted} />
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      {!!role && (
        <Text style={styles.role} numberOfLines={1}>
          {role}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 92,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: colors.goldMuted,
    padding: 2,
    marginBottom: 8,
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(0,0,0,0.5)' } as object,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 4,
      },
    }),
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: colors.surfaceCard,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  role: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default CastCard;
