import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCollection } from '../context/CollectionContext';
import { StatCard } from '../components/StatCard';
import { CardGridItem } from '../components/CardGridItem';
import { AlertBanner } from '../components/AlertBanner';
import { SportFilterBar } from '../components/SportFilterBar';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';
import { formatCurrency } from '../utils/helpers';
import { CardData } from '../types';

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const {
    stats,
    triggeredAlerts,
    isLoading,
    isRefreshingPrices,
    priceRefreshProgress,
    refreshPricing,
    dismissTriggeredAlert,
  } = useCollection();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPricing();
    setRefreshing(false);
  }, [refreshPricing]);

  const handleCardPress = (card: CardData) => {
    navigation.navigate('CardDetail', { cardId: card.id });
  };

  const profitLossColor =
    (stats?.totalProfitLoss || 0) >= 0 ? COLORS.priceUp : COLORS.priceDown;
  const profitLossTrend =
    (stats?.totalProfitLoss || 0) >= 0 ? 'up' : (stats?.totalProfitLoss || 0) < 0 ? 'down' : 'neutral';

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>CardVault</Text>
            <Text style={styles.subtitle}>Your Collection</Text>
          </View>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <Ionicons name="camera" size={20} color={COLORS.textPrimary} />
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Price refresh progress */}
        {isRefreshingPrices && priceRefreshProgress && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(priceRefreshProgress.completed / priceRefreshProgress.total) * 100}%`,
                },
              ]}
            />
            <Text style={styles.progressText}>
              Updating prices... {priceRefreshProgress.completed}/{priceRefreshProgress.total}
            </Text>
          </View>
        )}

        {/* Triggered Alerts */}
        {triggeredAlerts.length > 0 && (
          <View style={styles.section}>
            {triggeredAlerts.map((alert) => (
              <AlertBanner
                key={alert.id}
                alert={alert}
                onDismiss={() => dismissTriggeredAlert(alert.id)}
                onPress={() =>
                  navigation.navigate('CardDetail', { cardId: alert.cardId })
                }
              />
            ))}
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            title="Collection Value"
            value={formatCurrency(stats?.totalValue || 0)}
            icon="wallet"
            iconColor={COLORS.accent}
          />
          <StatCard
            title="Total Cards"
            value={String(stats?.totalCards || 0)}
            icon="layers"
            iconColor={COLORS.info}
          />
          <StatCard
            title="Profit / Loss"
            value={formatCurrency(stats?.totalProfitLoss || 0)}
            subtitle={
              stats?.totalCost
                ? `on ${formatCurrency(stats.totalCost)} invested`
                : undefined
            }
            icon="trending-up"
            iconColor={profitLossColor}
            trend={profitLossTrend as any}
          />
        </View>

        {/* Sport Breakdown */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Sport</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.sportBreakdown}>
                {Object.entries(stats.bySport)
                  .filter(([, data]) => data.count > 0)
                  .map(([sport, data]) => (
                    <View key={sport} style={styles.sportChip}>
                      <Text style={styles.sportCount}>{data.count}</Text>
                      <Text style={styles.sportLabel}>
                        {sport.charAt(0).toUpperCase() + sport.slice(1)}
                      </Text>
                      <Text style={styles.sportValue}>{formatCurrency(data.value)}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Biggest Movers */}
        {stats?.biggestMovers && stats.biggestMovers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biggest Movers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {stats.biggestMovers.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.moverCard}
                  onPress={() => handleCardPress(card)}
                >
                  <Text style={styles.moverName} numberOfLines={1}>
                    {card.playerName}
                  </Text>
                  <Text style={styles.moverSet} numberOfLines={1}>
                    {card.year} {card.set}
                  </Text>
                  <Text style={styles.moverPrice}>
                    {formatCurrency(card.pricing?.averageLast10)}
                  </Text>
                  {card.pricing?.lastSoldPrice && card.pricing?.averageLast10 && (
                    <Text
                      style={[
                        styles.moverChange,
                        {
                          color:
                            card.pricing.lastSoldPrice >= card.pricing.averageLast10
                              ? COLORS.priceUp
                              : COLORS.priceDown,
                        },
                      ]}
                    >
                      {card.pricing.lastSoldPrice >= card.pricing.averageLast10 ? '▲' : '▼'}{' '}
                      {Math.abs(
                        ((card.pricing.lastSoldPrice - card.pricing.averageLast10) /
                          card.pricing.averageLast10) *
                          100
                      ).toFixed(1)}
                      %
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recently Scanned */}
        {stats?.recentlyScanned && stats.recentlyScanned.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Scanned</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Collection')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.recentGrid}>
              {stats.recentlyScanned.slice(0, 6).map((card) => (
                <CardGridItem
                  key={card.id}
                  card={card}
                  onPress={handleCardPress}
                  columnCount={3}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {!stats || stats.totalCards === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Start Your Collection</Text>
            <Text style={styles.emptySubtitle}>
              Scan your cards to get started. Point your camera at a binder page,
              top-loader, or loose card.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Scan')}
            >
              <Ionicons name="camera" size={20} color={COLORS.textPrimary} />
              <Text style={styles.emptyButtonText}>Scan Cards</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
  },
  appName: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: FONTS.weights.heavy,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
  },
  scanButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  progressBar: {
    height: 24,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.sm,
  },
  progressText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontWeight: FONTS.weights.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  seeAll: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.accent,
    fontWeight: FONTS.weights.semibold,
  },
  sportBreakdown: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  sportChip: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sportCount: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.heavy,
    color: COLORS.textPrimary,
  },
  sportLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sportValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.accent,
    marginTop: 4,
  },
  moverCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginLeft: SPACING.xl,
    width: 150,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  moverName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  moverSet: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  moverPrice: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.accent,
    marginTop: SPACING.sm,
  },
  moverChange: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    marginTop: 2,
  },
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xl,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.round,
    marginTop: SPACING.xxl,
  },
  emptyButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
});
