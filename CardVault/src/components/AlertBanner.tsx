import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PriceAlert } from '../types';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';
import { formatCurrency } from '../utils/helpers';

interface Props {
  alert: PriceAlert;
  onDismiss: () => void;
  onPress: () => void;
}

export function AlertBanner({ alert, onDismiss, onPress }: Props) {
  const currentPrice = alert.lastCheckedPrice;
  const changePercent = alert.lastCheckedPrice
    ? ((currentPrice - (alert.card.pricing?.averageLast10 || 0)) /
        (alert.card.pricing?.averageLast10 || 1)) *
      100
    : 0;
  const isUp = changePercent > 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={isUp ? 'trending-up' : 'trending-down'}
          size={20}
          color={isUp ? COLORS.priceUp : COLORS.priceDown}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {alert.card.playerName}
        </Text>
        <Text style={styles.detail}>
          {isUp ? '▲' : '▼'} {Math.abs(changePercent).toFixed(1)}% to{' '}
          {formatCurrency(currentPrice)}
        </Text>
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.dismiss}>
        <Ionicons name="close" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  iconWrap: {
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  detail: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dismiss: {
    padding: SPACING.xs,
  },
});
