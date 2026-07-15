/**
 * StarRating — animated 5-star interactive rating component.
 * Gold filled/empty stars with press-and-hold haptic-style feedback.
 * Pass `readOnly` to show a static rating (e.g. in lists).
 */
import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { ND } from '../utils/animation';

interface StarRatingProps {
  rating: number;         // 0–5 (0 = unrated)
  onRate?: (stars: number) => void;
  size?: number;
  readOnly?: boolean;
  showLabel?: boolean;
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRate,
  size = 28,
  readOnly = false,
  showLabel = false,
}) => {
  const scaleAnims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(1)),
  ).current;

  const animateStar = (index: number) => {
    Animated.sequence([
      Animated.spring(scaleAnims[index], {
        toValue: 1.45,
        speed: 40,
        bounciness: 10,
        useNativeDriver: ND,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        speed: 20,
        bounciness: 4,
        useNativeDriver: ND,
      }),
    ]).start();
  };

  const handlePress = (stars: number) => {
    if (readOnly || !onRate) return;
    // Tapping the same star again clears the rating
    const newRating = stars === rating ? 0 : stars;
    animateStar(stars - 1);
    onRate(newRating);
  };

  return (
    <View style={styles.root}>
      <View style={styles.starsRow}>
        {Array.from({ length: 5 }, (_, i) => {
          const starNum = i + 1;
          const filled = starNum <= rating;
          return (
            <TouchableOpacity
              key={starNum}
              onPress={() => handlePress(starNum)}
              disabled={readOnly}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnims[i] }] }}>
                <Ionicons
                  name={filled ? 'star' : 'star-outline'}
                  size={size}
                  color={filled ? colors.gold : 'rgba(212,175,55,0.3)'}
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
      {showLabel && rating > 0 && (
        <Text style={[styles.label, { fontSize: size * 0.45 }]}>
          {LABELS[rating]}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  label: {
    color: colors.gold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default StarRating;
