import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCollection } from '../context/CollectionContext';
import { PriceSparkline } from '../components/PriceSparkline';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';
import {
  formatCurrency,
  formatDate,
  generateEbayTitle,
  calculateProfitLoss,
  getSportColor,
  timeAgo,
} from '../utils/helpers';
import { CardData, Sport, CardEdition, CardCondition } from '../types';

const SPORTS: Sport[] = ['football', 'basketball', 'soccer', 'baseball', 'hockey', 'other'];
const EDITIONS: CardEdition[] = [
  'base', 'rookie', 'holo', 'refractor', 'prizm', 'auto', 'relic',
  'numbered', 'parallel', 'insert', 'short-print', 'super-short-print',
  'case-hit', 'one-of-one', 'other',
];

export function CardDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { cards, updateCardData, removeCard, refreshPricing, toggleWatchlist, addPriceAlert } =
    useCollection();

  const cardId = route.params?.cardId;
  const passedCard = route.params?.card as CardData | undefined;
  const isNew = route.params?.isNew || false;

  const [card, setCard] = useState<CardData | null>(
    passedCard || cards.find((c) => c.id === cardId) || null
  );
  const [isEditing, setIsEditing] = useState(isNew && card?.needsReview);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    playerName: card?.playerName || '',
    year: card?.year || '',
    set: card?.set || '',
    cardNumber: card?.cardNumber || '',
    sport: card?.sport || 'other' as Sport,
    edition: card?.edition || 'base' as CardEdition,
    editionDetails: card?.editionDetails || '',
    purchasePrice: card?.purchasePrice?.toString() || '',
    notes: card?.notes || '',
  });

  // Sync card data when collection updates
  useEffect(() => {
    const found = cards.find((c) => c.id === cardId);
    if (found) setCard(found);
  }, [cards, cardId]);

  const handleSave = useCallback(async () => {
    if (!card) return;

    await updateCardData(card.id, {
      playerName: editForm.playerName,
      year: editForm.year,
      set: editForm.set,
      cardNumber: editForm.cardNumber,
      sport: editForm.sport,
      edition: editForm.edition,
      editionDetails: editForm.editionDetails || undefined,
      purchasePrice: editForm.purchasePrice ? parseFloat(editForm.purchasePrice) : null,
      notes: editForm.notes || undefined,
      needsReview: false,
      reviewReason: undefined,
    });

    setIsEditing(false);
  }, [card, editForm, updateCardData]);

  const handleRefreshPrice = useCallback(async () => {
    if (!card) return;
    setIsPricingLoading(true);
    try {
      await refreshPricing(card.id);
    } finally {
      setIsPricingLoading(false);
    }
  }, [card, refreshPricing]);

  const handleCopyTitle = useCallback(async () => {
    if (!card) return;
    const title = generateEbayTitle(card);
    await Clipboard.setStringAsync(title);
    Alert.alert('Copied!', `"${title}" copied to clipboard`);
  }, [card]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Card', 'Are you sure you want to remove this card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (card) {
            await removeCard(card.id);
            navigation.goBack();
          }
        },
      },
    ]);
  }, [card, removeCard, navigation]);

  if (!card) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Card not found</Text>
      </View>
    );
  }

  const profitLoss = calculateProfitLoss(card);
  const sportColor = getSportColor(card.sport);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => toggleWatchlist(card.id)}
            style={styles.headerButton}
          >
            <Ionicons
              name={card.isWatchlist ? 'star' : 'star-outline'}
              size={22}
              color={card.isWatchlist ? COLORS.warning : COLORS.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsEditing(!isEditing)}
            style={styles.headerButton}
          >
            <Ionicons
              name={isEditing ? 'close' : 'create-outline'}
              size={22}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Card Image */}
        {card.imageUri ? (
          <Image source={{ uri: card.imageUri }} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <View style={[styles.cardImagePlaceholder, { borderColor: sportColor }]}>
            <Ionicons name="card" size={48} color={COLORS.textMuted} />
          </View>
        )}

        {/* Review Banner */}
        {card.needsReview && (
          <View style={styles.reviewBanner}>
            <Ionicons name="alert-circle" size={18} color={COLORS.warning} />
            <Text style={styles.reviewBannerText}>
              {card.reviewReason || 'This card needs manual review'}
            </Text>
          </View>
        )}

        {/* Edit Form or Details */}
        {isEditing ? (
          <View style={styles.editForm}>
            <Text style={styles.editTitle}>Edit Card Details</Text>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.label}>Player Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.playerName}
                  onChangeText={(text) => setEditForm((f) => ({ ...f, playerName: text }))}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="Patrick Mahomes"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.label}>Year</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.year}
                  onChangeText={(text) => setEditForm((f) => ({ ...f, year: text }))}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="2023"
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.formField, { flex: 2 }]}>
                <Text style={styles.label}>Set / Series</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.set}
                  onChangeText={(text) => setEditForm((f) => ({ ...f, set: text }))}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="Panini Prizm"
                />
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.label}>Card #</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.cardNumber}
                  onChangeText={(text) => setEditForm((f) => ({ ...f, cardNumber: text }))}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="101"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.label}>Sport</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {SPORTS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.chip,
                          editForm.sport === s && styles.chipActive,
                        ]}
                        onPress={() => setEditForm((f) => ({ ...f, sport: s }))}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            editForm.sport === s && styles.chipTextActive,
                          ]}
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.label}>Edition</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {EDITIONS.map((e) => (
                      <TouchableOpacity
                        key={e}
                        style={[
                          styles.chip,
                          editForm.edition === e && styles.chipActive,
                        ]}
                        onPress={() => setEditForm((f) => ({ ...f, edition: e }))}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            editForm.edition === e && styles.chipTextActive,
                          ]}
                        >
                          {e}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.label}>Edition Details (e.g. /25, Silver)</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.editionDetails}
                  onChangeText={(text) => setEditForm((f) => ({ ...f, editionDetails: text }))}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="/25"
                />
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.label}>Purchase Price</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.purchasePrice}
                  onChangeText={(text) => setEditForm((f) => ({ ...f, purchasePrice: text }))}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  value={editForm.notes}
                  onChangeText={(text) => setEditForm((f) => ({ ...f, notes: text }))}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="Any notes about this card..."
                  multiline
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Card Details */}
            <View style={styles.detailSection}>
              <Text style={styles.playerName}>{card.playerName}</Text>
              <Text style={styles.cardMeta}>
                {card.year} {card.set} #{card.cardNumber}
              </Text>

              <View style={styles.badges}>
                <View style={[styles.sportBadge, { backgroundColor: sportColor }]}>
                  <Text style={styles.badgeText}>{card.sport}</Text>
                </View>
                {card.edition !== 'base' && (
                  <View style={styles.editionBadge}>
                    <Text style={styles.badgeText}>{card.edition}</Text>
                  </View>
                )}
                {card.editionDetails && (
                  <View style={styles.editionBadge}>
                    <Text style={styles.badgeText}>{card.editionDetails}</Text>
                  </View>
                )}
                <View style={styles.conditionBadge}>
                  <Text style={styles.badgeText}>{card.condition}</Text>
                </View>
              </View>

              {/* eBay Title Copy */}
              <TouchableOpacity style={styles.copyTitleButton} onPress={handleCopyTitle}>
                <Ionicons name="copy-outline" size={16} color={COLORS.accent} />
                <Text style={styles.copyTitleText}>Copy eBay Listing Title</Text>
              </TouchableOpacity>
            </View>

            {/* Pricing Section */}
            <View style={styles.pricingSection}>
              <View style={styles.pricingHeader}>
                <Text style={styles.sectionTitle}>Pricing</Text>
                <TouchableOpacity
                  onPress={handleRefreshPrice}
                  disabled={isPricingLoading}
                  style={styles.refreshButton}
                >
                  {isPricingLoading ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : (
                    <Ionicons name="refresh" size={18} color={COLORS.accent} />
                  )}
                  <Text style={styles.refreshText}>
                    {card.lastPriceRefreshDate
                      ? `Updated ${timeAgo(card.lastPriceRefreshDate)}`
                      : 'Get Prices'}
                  </Text>
                </TouchableOpacity>
              </View>

              {card.pricing ? (
                <>
                  {/* Price chart */}
                  {card.pricing.last10Sales.length > 1 && (
                    <View style={styles.chartContainer}>
                      <PriceSparkline sales={card.pricing.last10Sales} width={320} height={100} />
                    </View>
                  )}

                  {/* Price grid */}
                  <View style={styles.priceGrid}>
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>Last Sold</Text>
                      <Text style={styles.priceValue}>
                        {formatCurrency(card.pricing.lastSoldPrice)}
                      </Text>
                      {card.pricing.lastSoldDate && (
                        <Text style={styles.priceDate}>
                          {formatDate(card.pricing.lastSoldDate)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>Avg (Last 10)</Text>
                      <Text style={styles.priceValue}>
                        {formatCurrency(card.pricing.averageLast10)}
                      </Text>
                    </View>
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>30-Day High</Text>
                      <Text style={[styles.priceValue, { color: COLORS.priceUp }]}>
                        {formatCurrency(card.pricing.thirtyDayHigh)}
                      </Text>
                    </View>
                    <View style={styles.priceItem}>
                      <Text style={styles.priceLabel}>30-Day Low</Text>
                      <Text style={[styles.priceValue, { color: COLORS.priceDown }]}>
                        {formatCurrency(card.pricing.thirtyDayLow)}
                      </Text>
                    </View>
                  </View>

                  {/* Recommended List Price */}
                  <View style={styles.recommendedPrice}>
                    <View>
                      <Text style={styles.recommendedLabel}>Recommended List Price</Text>
                      <Text style={styles.recommendedSubtext}>
                        Avg x 1.07 = 7% above market
                      </Text>
                    </View>
                    <Text style={styles.recommendedValue}>
                      {formatCurrency(card.pricing.recommendedListPrice)}
                    </Text>
                  </View>

                  {/* Net Payout Breakdown */}
                  <View style={styles.payoutSection}>
                    <Text style={styles.payoutTitle}>Estimated Net Payout</Text>
                    <View style={styles.payoutRow}>
                      <Text style={styles.payoutLabel}>List Price</Text>
                      <Text style={styles.payoutValue}>
                        {formatCurrency(card.pricing.recommendedListPrice)}
                      </Text>
                    </View>
                    <View style={styles.payoutRow}>
                      <Text style={styles.payoutLabel}>
                        Shipping ({card.pricing.shippingMethod === 'PWE' ? 'PWE' : 'Bubble Mailer'})
                      </Text>
                      <Text style={styles.payoutValue}>
                        +{formatCurrency(card.pricing.shippingCost)}
                      </Text>
                    </View>
                    <View style={styles.payoutRow}>
                      <Text style={styles.payoutLabel}>eBay Fee (13.25%)</Text>
                      <Text style={[styles.payoutValue, { color: COLORS.priceDown }]}>
                        -{formatCurrency(card.pricing.ebayFee)}
                      </Text>
                    </View>
                    <View style={styles.payoutRow}>
                      <Text style={styles.payoutLabel}>Shipping Cost</Text>
                      <Text style={[styles.payoutValue, { color: COLORS.priceDown }]}>
                        -{formatCurrency(card.pricing.shippingCost)}
                      </Text>
                    </View>
                    <View style={[styles.payoutRow, styles.payoutTotal]}>
                      <Text style={styles.payoutTotalLabel}>You Keep</Text>
                      <Text style={styles.payoutTotalValue}>
                        {formatCurrency(card.pricing.estimatedNetPayout)}
                      </Text>
                    </View>
                  </View>

                  {/* PSA Comparison */}
                  {card.pricing.psaGradedPrice && (
                    <View style={styles.psaSection}>
                      <Ionicons name="shield-checkmark" size={18} color={COLORS.info} />
                      <View style={styles.psaContent}>
                        <Text style={styles.psaTitle}>PSA 10 Graded Value</Text>
                        <Text style={styles.psaPrice}>
                          {formatCurrency(card.pricing.psaGradedPrice)}
                        </Text>
                        <Text style={styles.psaHint}>
                          Grading may be worth it if raw value is{' '}
                          {formatCurrency((card.pricing.psaGradedPrice || 0) * 0.4)} or more
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Source */}
                  <Text style={styles.sourceText}>
                    Data from {card.pricing.source === '130point' ? '130point.com' : 'eBay (via ScrapingBee)'}
                  </Text>
                </>
              ) : (
                <View style={styles.noPricing}>
                  <Ionicons name="pricetag-outline" size={32} color={COLORS.textMuted} />
                  <Text style={styles.noPricingText}>
                    No pricing data yet. Tap refresh to look up sold prices.
                  </Text>
                </View>
              )}
            </View>

            {/* Profit/Loss */}
            {card.purchasePrice != null && (
              <View style={styles.profitSection}>
                <Text style={styles.sectionTitle}>Investment</Text>
                <View style={styles.profitRow}>
                  <View>
                    <Text style={styles.profitLabel}>Paid</Text>
                    <Text style={styles.profitValue}>{formatCurrency(card.purchasePrice)}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />
                  <View>
                    <Text style={styles.profitLabel}>Current Value</Text>
                    <Text style={styles.profitValue}>
                      {formatCurrency(card.pricing?.averageLast10)}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />
                  <View>
                    <Text style={styles.profitLabel}>P/L</Text>
                    <Text
                      style={[
                        styles.profitValue,
                        {
                          color:
                            (profitLoss || 0) >= 0 ? COLORS.priceUp : COLORS.priceDown,
                        },
                      ]}
                    >
                      {profitLoss !== null
                        ? `${profitLoss >= 0 ? '+' : ''}${formatCurrency(profitLoss)}`
                        : '--'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Price Alert Button */}
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => addPriceAlert(card.id)}
            >
              <Ionicons name="notifications-outline" size={18} color={COLORS.textPrimary} />
              <Text style={styles.alertButtonText}>Set Price Alert (±10%)</Text>
            </TouchableOpacity>

            {/* Scan Info */}
            <View style={styles.metaSection}>
              <Text style={styles.metaText}>Scanned {formatDate(card.scanDate)}</Text>
              {card.notes && <Text style={styles.notesText}>{card.notes}</Text>}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  errorText: { color: COLORS.textMuted, fontSize: FONTS.sizes.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xxl, paddingBottom: SPACING.md,
  },
  headerActions: { flexDirection: 'row', gap: SPACING.md },
  headerButton: { padding: SPACING.xs },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  cardImage: {
    width: '100%', height: 300, backgroundColor: COLORS.surface,
  },
  cardImagePlaceholder: {
    width: '60%', aspectRatio: 0.72, alignSelf: 'center',
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, marginVertical: SPACING.lg,
  },
  reviewBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: 'rgba(255,214,0,0.1)', borderLeftWidth: 3,
    borderLeftColor: COLORS.warning, padding: SPACING.md,
    marginHorizontal: SPACING.xl, marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  reviewBannerText: { color: COLORS.warning, fontSize: FONTS.sizes.sm, flex: 1 },
  detailSection: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  playerName: {
    fontSize: FONTS.sizes.xxxl, fontWeight: FONTS.weights.heavy,
    color: COLORS.textPrimary,
  },
  cardMeta: {
    fontSize: FONTS.sizes.lg, color: COLORS.textSecondary, marginTop: SPACING.xs,
  },
  badges: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, flexWrap: 'wrap' },
  sportBadge: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  editionBadge: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.surfaceHighlight,
  },
  conditionBadge: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  badgeText: {
    fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary, textTransform: 'capitalize',
  },
  copyTitleButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginTop: SPACING.lg, paddingVertical: SPACING.sm,
  },
  copyTitleText: { fontSize: FONTS.sizes.sm, color: COLORS.accent, fontWeight: FONTS.weights.semibold },
  pricingSection: {
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xxl,
  },
  pricingHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary,
  },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  refreshText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  chartContainer: { alignItems: 'center', marginBottom: SPACING.lg },
  priceGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md,
  },
  priceItem: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, flex: 1, minWidth: '45%',
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  priceLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  priceValue: {
    fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary, marginTop: SPACING.xs,
  },
  priceDate: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  recommendedPrice: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surfaceHighlight, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, marginTop: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.accent, borderStyle: 'dashed',
  },
  recommendedLabel: {
    fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary,
  },
  recommendedSubtext: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  recommendedValue: {
    fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.heavy, color: COLORS.accent,
  },
  payoutSection: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, marginTop: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  payoutTitle: {
    fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.md,
  },
  payoutRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  payoutLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  payoutValue: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, fontWeight: FONTS.weights.medium },
  payoutTotal: {
    borderTopWidth: 1, borderTopColor: COLORS.cardBorder,
    marginTop: SPACING.sm, paddingTop: SPACING.md,
  },
  payoutTotalLabel: {
    fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary,
  },
  payoutTotalValue: {
    fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.heavy, color: COLORS.accent,
  },
  psaSection: {
    flexDirection: 'row', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, marginTop: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.info,
  },
  psaContent: { flex: 1 },
  psaTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  psaPrice: {
    fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.heavy,
    color: COLORS.info, marginTop: SPACING.xs,
  },
  psaHint: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: SPACING.xs },
  sourceText: {
    fontSize: FONTS.sizes.xs, color: COLORS.textMuted,
    textAlign: 'center', marginTop: SPACING.lg,
  },
  noPricing: {
    alignItems: 'center', paddingVertical: SPACING.xxl,
  },
  noPricingText: {
    fontSize: FONTS.sizes.sm, color: COLORS.textMuted,
    textAlign: 'center', marginTop: SPACING.md,
  },
  profitSection: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xxl },
  profitRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, marginTop: SPACING.md,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  profitLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  profitValue: {
    fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary, marginTop: 2,
  },
  alertButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, backgroundColor: COLORS.surfaceHighlight,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.lg,
    marginHorizontal: SPACING.xl, marginTop: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  alertButtonText: {
    fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary,
  },
  metaSection: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl },
  metaText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  notesText: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
    marginTop: SPACING.sm, fontStyle: 'italic',
  },
  // Edit form styles
  editForm: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  editTitle: {
    fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.lg,
  },
  formRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  formField: {},
  label: {
    fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary, marginBottom: SPACING.xs,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  chipRow: { flexDirection: 'row', gap: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: {
    fontSize: FONTS.sizes.xs, color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  chipTextActive: { color: COLORS.textPrimary, fontWeight: FONTS.weights.bold },
  saveButton: {
    backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg, alignItems: 'center', marginTop: SPACING.lg,
  },
  saveButtonText: {
    fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary,
  },
});
