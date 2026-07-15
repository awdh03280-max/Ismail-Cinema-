/**
 * SeriesCollectionsSection — horizontal scroll of franchise/universe cards
 * for the Home screen's "Movie Series Collections" row (Marvel, DC, Harry
 * Potter, Fast & Furious, John Wick, Mission: Impossible, The Conjuring
 * Universe, etc). Distinct from CollectionsSection, which groups by genre.
 */
import React, { useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SERIES_COLLECTIONS, SeriesCollection } from '../data/seriesCollections';
import SectionTitle from './SectionTitle';
import { colors } from '../theme/colors';
import { ND } from '../utils/animation';

interface Props {
  onCollectionPress: (collection: SeriesCollection) => void;
}

const SeriesCollectionCard: React.FC<{
  collection: SeriesCollection;
  onPress: () => void;
}> = ({ collection, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.95, speed: 35, bounciness: 0, useNativeDriver: ND }).start();

  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, speed: 22, bounciness: 5, useNativeDriver: ND }).start();

  return (
    <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={collection.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.glowBlob} />

          <Text style={styles.cardIcon}>{collection.icon}</Text>

          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={2}>
              {collection.name}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {collection.subtitle}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.exploreText}>Explore</Text>
              <Ionicons name="arrow-forward" size={11} color={colors.gold} />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const SeriesCollectionsSection: React.FC<Props> = ({ onCollectionPress }) => (
  <View style={styles.root}>
    <SectionTitle title="🎬 Movie Series Collections" />
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      decelerationRate="fast"
    >
      {SERIES_COLLECTIONS.map((col) => (
        <SeriesCollectionCard
          key={col.id}
          collection={col}
          onPress={() => onCollectionPress(col)}
        />
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  root: { marginBottom: 8 },
  scroll: { paddingHorizontal: 16, gap: 12 },

  card: {
    width: 158,
    height: 218,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  glowBlob: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardIcon: {
    fontSize: 42,
    lineHeight: 50,
  },
  cardBody: {
    gap: 4,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  cardSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  exploreText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

export default SeriesCollectionsSection;
