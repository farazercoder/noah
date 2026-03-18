import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCollection } from '../context/CollectionContext';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';
import { formatCurrency, timeAgo, getSportColor } from '../utils/helpers';
import { CardData, PriceAlert } from '../types';

export function WatchlistScreen() {
  const navigation = useNavigation<any>();
  const {
    cards,
    alerts,
    triggeredAlerts,
    getWatchlistCardsList,
    toggleWatchlist,
    removePriceAlert,
    refreshPricing,
    isRefreshingPrices,
  } = useCollection();

  const watchlistCards = useMemo(() => getWatchlistCardsList(), [getWatchlistCardsList]);

  const handleCardPress = (card: CardData) => {
    navigation.navigate('CardDetail', { cardId: card.id });
  };

  const renderWatchlistItem = ({ item: card }: { item: CardData }) => {
    const alert = alerts.find((a) => a.cardId === card.id);
    const sportColor = getSportColor(card.sport);
    const priceChange = card.pricing?.lastSoldPrice && card.pricing?.averageLast10
      ? ((card.pricing.lastSoldPrice - card.pricing.averageLast10) / card.pricing.averageLast10) * 100
      : null;

    return (
      <TouchableOpacity
        style={styles.watchlistItem}
        onPress={() => handleCardPress(card)}
        activeOpacity={0.8}
      >
        {/* Sport indicator */}
        <View style={[styles.sportStripe, { backgroundColor: sportColor }]} />

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Text style={styles.playerName} numberOfLines={1}>{card.playerName}</Text>
              <Text style={styles.cardMeta}>
                {card.year} {card.set} #{card.cardNumber}
              </Text>
            </View>

            <View style={styles.priceSection}>
              <Text style={styles.currentPrice}>
                {formatCurrency(card.pricing?.averageLast10)}
              </Text>
              {priceChange !== null && (
                <View style={[
                  styles.changeBadge,
                  { backgroundColor: priceChange >= 0 ? `${COLORS.priceUp}20` : `${COLORS.priceDown}20` },
                ]}>
                  <Text style={[
                    styles.changeText,
                    { color: priceChange >= 0 ? COLORS.priceUp : COLORS.priceDown },
                  ]}>
                    {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.itemFooter}>
            <View style={styles.footerLeft}>
              {alert && (
                <View style={styles.alertIndicator}>
                  <Ionicons name="notifications" size={12} color={COLORS.info} />
                  <Text style={styles.alertText}>Alert at ±{alert.targetPercentChange}%</Text>
                </View>
              )}
              {card.lastPriceRefreshDate && (
                <Text style={styles.lastUpdated}>
                  Updated {timeAgo(card.lastPriceRefreshDate)}
                </Text>
              )}
            </View>

            <View style={styles.footerActions}>
              {!alert && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    // Would add alert
                  }}
                >
                  <Ionicons name="notifications-outline" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleWatchlist(card.id)}
              >
                <Ionicons name="star" size={16} color={COLORS.warning} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Price range bar */}
          {card.pricing?.thirtyDayLow != null && card.pricing?.thirtyDayHigh != null && (
            <View style={styles.priceRange}>
              <Text style={styles.rangeLabel}>30d Range</Text>
              <View style={styles.rangeBar}>
                <View style={styles.rangeTrack} />
                {card.pricing.averageLast10 && (
                  <View
                    style={[
                      styles.rangeMarker,
                      {
                        left: `${
                          ((card.pricing.averageLast10 - card.pricing.thirtyDayLow) /
                            (card.pricing.thirtyDayHigh - card.pricing.thirtyDayLow || 1)) *
                          100
                        }%`,
                      },
                    ]}
                  />
                )}
              </View>
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeLow}>{formatCurrency(card.pricing.thirtyDayLow)}</Text>
                <Text style={styles.rangeHigh}>{formatCurrency(card.pricing.thirtyDayHigh)}</Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Watchlist</Text>
          <Text style={styles.subtitle}>
            {watchlistCards.length} card{watchlistCards.length !== 1 ? 's' : ''} tracked
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshAll}
          onPress={() => refreshPricing()}
          disabled={isRefreshingPrices}
        >
          <Ionicons
            name="refresh"
            size={18}
            color={isRefreshingPrices ? COLORS.textMuted : COLORS.accent}
          />
          <Text style={[styles.refreshText, isRefreshingPrices && { color: COLORS.textMuted }]}>
            {isRefreshingPrices ? 'Updating...' : 'Refresh All'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Alerts Section */}
      {triggeredAlerts.length > 0 && (
        <View style={styles.alertSection}>
          <Text style={styles.alertSectionTitle}>
            Active Alerts ({triggeredAlerts.length})
          </Text>
          {triggeredAlerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.triggeredAlert}
              onPress={() => handleCardPress(alert.card)}
            >
              <Ionicons name="notifications" size={18} color={COLORS.accent} />
              <View style={styles.triggeredAlertContent}>
                <Text style={styles.triggeredAlertName}>{alert.card.playerName}</Text>
                <Text style={styles.triggeredAlertDetail}>
                  Price moved to {formatCurrency(alert.lastCheckedPrice)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Watchlist Items */}
      <FlatList
        data={watchlistCards}
        keyExtractor={(item) => item.id}
        renderItem={renderWatchlistItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Watchlist Cards</Text>
            <Text style={styles.emptySubtitle}>
              Star cards you want to track. You'll see price movements and can set alerts.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xxl, paddingBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.xxxl, fontWeight: FONTS.weights.heavy, color: COLORS.textPrimary,
  },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  refreshAll: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round, backgroundColor: COLORS.surface,
  },
  refreshText: { fontSize: FONTS.sizes.sm, color: COLORS.accent, fontWeight: FONTS.weights.semibold },
  alertSection: {
    paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg,
  },
  alertSectionTitle: {
    fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold,
    color: COLORS.accent, marginBottom: SPACING.sm,
  },
  triggeredAlert: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surfaceHighlight, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.xs,
    borderLeftWidth: 3, borderLeftColor: COLORS.accent,
  },
  triggeredAlertContent: { flex: 1 },
  triggeredAlertName: {
    fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary,
  },
  triggeredAlertDetail: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  list: { paddingHorizontal: SPACING.xl },
  watchlistItem: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.md,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  sportStripe: { width: 4 },
  itemContent: { flex: 1, padding: SPACING.lg },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemInfo: { flex: 1, marginRight: SPACING.md },
  playerName: {
    fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary,
  },
  cardMeta: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  priceSection: { alignItems: 'flex-end' },
  currentPrice: {
    fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.heavy, color: COLORS.accent,
  },
  changeBadge: {
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm, marginTop: SPACING.xs,
  },
  changeText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
  itemFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: SPACING.md,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  alertIndicator: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  alertText: { fontSize: FONTS.sizes.xs, color: COLORS.info },
  lastUpdated: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  footerActions: { flexDirection: 'row', gap: SPACING.sm },
  actionButton: { padding: SPACING.xs },
  priceRange: { marginTop: SPACING.md },
  rangeLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: SPACING.xs },
  rangeBar: { height: 4, position: 'relative' },
  rangeTrack: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: COLORS.surfaceHighlight, borderRadius: 2,
  },
  rangeMarker: {
    position: 'absolute', width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.accent, top: -2,
  },
  rangeLabels: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs,
  },
  rangeLow: { fontSize: FONTS.sizes.xs, color: COLORS.priceDown },
  rangeHigh: { fontSize: FONTS.sizes.xs, color: COLORS.priceUp },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: {
    fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary, marginTop: SPACING.xl,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md, color: COLORS.textSecondary,
    textAlign: 'center', marginTop: SPACING.sm, paddingHorizontal: SPACING.xxl,
  },
});
