import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ title, value, subtitle, icon, iconColor, trend }: Props) {
  const trendColor =
    trend === 'up' ? COLORS.priceUp : trend === 'down' ? COLORS.priceDown : COLORS.textMuted;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name={icon as any} size={18} color={iconColor || COLORS.accent} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, trend ? { color: trendColor } : null]}>
          {trend === 'up' && '▲ '}
          {trend === 'down' && '▼ '}
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    flex: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.heavy,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
});
