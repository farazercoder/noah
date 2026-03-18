import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CardData } from '../types';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';
import { formatCurrency, getSportColor, calculateProfitLoss } from '../utils/helpers';

interface Props {
  card: CardData;
  onPress: (card: CardData) => void;
  columnCount?: number;
}

export function CardGridItem({ card, onPress, columnCount = 3 }: Props) {
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - SPACING.lg * 2 - SPACING.md * (columnCount - 1)) / columnCount;

  const profitLoss = calculateProfitLoss(card);
  const currentValue = card.pricing?.averageLast10;
  const sportColor = getSportColor(card.sport);

  return (
    <TouchableOpacity
      style={[styles.container, { width: itemWidth }]}
      onPress={() => onPress(card)}
      activeOpacity={0.8}
    >
      {/* Card Image / Placeholder */}
      <View style={styles.imageContainer}>
        {card.imageUri ? (
          <Image source={{ uri: card.imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.placeholder, { borderColor: sportColor }]}>
            <Ionicons name="card" size={28} color={COLORS.textMuted} />
            <Text style={styles.placeholderYear}>{card.year}</Text>
          </View>
        )}

        {/* Sport indicator dot */}
        <View style={[styles.sportDot, { backgroundColor: sportColor }]} />

        {/* Watchlist star */}
        {card.isWatchlist && (
          <View style={styles.watchlistBadge}>
            <Ionicons name="star" size={12} color={COLORS.warning} />
          </View>
        )}

        {/* Review badge */}
        {card.needsReview && (
          <View style={styles.reviewBadge}>
            <Ionicons name="alert-circle" size={12} color={COLORS.warning} />
          </View>
        )}
      </View>

      {/* Card Info */}
      <View style={styles.info}>
        <Text style={styles.playerName} numberOfLines={1}>
          {card.playerName}
        </Text>
        <Text style={styles.setInfo} numberOfLines={1}>
          {card.year} {card.set}
        </Text>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatCurrency(currentValue)}</Text>
          {profitLoss !== null && (
            <Text
              style={[
                styles.profitLoss,
                { color: profitLoss >= 0 ? COLORS.priceUp : COLORS.priceDown },
              ]}
            >
              {profitLoss >= 0 ? '+' : ''}
              {formatCurrency(profitLoss)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  imageContainer: {
    aspectRatio: 0.72, // Standard card aspect ratio
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
  },
  placeholderYear: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  sportDot: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  watchlistBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  reviewBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: 2,
  },
  info: {
    padding: SPACING.sm,
  },
  playerName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  setInfo: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  price: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.accent,
  },
  profitLoss: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
});
