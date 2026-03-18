import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';
import { SportFilter } from '../types';

const FILTERS: { key: SportFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid' },
  { key: 'football', label: 'Football', icon: 'american-football' },
  { key: 'basketball', label: 'Basketball', icon: 'basketball' },
  { key: 'soccer', label: 'Soccer', icon: 'football' },
  { key: 'baseball', label: 'Baseball', icon: 'baseball' },
  { key: 'hockey', label: 'Ice Hockey', icon: 'snow' },
  { key: 'other', label: 'Other', icon: 'trophy' },
];

interface Props {
  activeFilter: SportFilter;
  onFilterChange: (filter: SportFilter) => void;
}

export function SportFilterBar({ activeFilter, onFilterChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.key;
        return (
          <TouchableOpacity
            key={filter.key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onFilterChange(filter.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={filter.icon as any}
              size={14}
              color={isActive ? COLORS.textPrimary : COLORS.textSecondary}
            />
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: SPACING.sm,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.textPrimary,
  },
});
