import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ContentCategory } from '../api/tmdb';
import { colors } from '../theme/colors';

interface CategoryTabsProps {
  active: ContentCategory;
  onChange: (category: ContentCategory) => void;
}

const TABS: { key: ContentCategory; label: string }[] = [
  { key: 'movies', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'anime', label: 'Anime' },
  { key: 'animation', label: 'Animation' },
];

const CategoryTabs: React.FC<CategoryTabsProps> = ({ active, onChange }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 4,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#000000',
  },
});

export default CategoryTabs;
