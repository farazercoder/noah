import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from './supabaseClient';
import { CardData, CollectionStats, PriceAlert, SportFilter } from '../types';
import { generateId, calculateProfitLoss } from '../utils/helpers';

const COLLECTION_KEY = 'card_collection';
const ALERTS_KEY = 'price_alerts';

// ========== LOCAL STORAGE (works offline) ==========

/**
 * Get all cards from local storage
 */
export async function getLocalCollection(): Promise<CardData[]> {
  try {
    const data = await AsyncStorage.getItem(COLLECTION_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to read collection:', error);
    return [];
  }
}

/**
 * Save entire collection to local storage
 */
async function saveLocalCollection(cards: CardData[]): Promise<void> {
  await AsyncStorage.setItem(COLLECTION_KEY, JSON.stringify(cards));
}

/**
 * Add cards to collection
 */
export async function addCards(newCards: CardData[]): Promise<void> {
  const existing = await getLocalCollection();
  const updated = [...existing, ...newCards];
  await saveLocalCollection(updated);
}

/**
 * Update a single card
 */
export async function updateCard(cardId: string, updates: Partial<CardData>): Promise<CardData | null> {
  const cards = await getLocalCollection();
  const index = cards.findIndex((c) => c.id === cardId);
  if (index === -1) return null;

  cards[index] = { ...cards[index], ...updates };
  await saveLocalCollection(cards);
  return cards[index];
}

/**
 * Delete a card
 */
export async function deleteCard(cardId: string): Promise<void> {
  const cards = await getLocalCollection();
  const filtered = cards.filter((c) => c.id !== cardId);
  await saveLocalCollection(filtered);
}

/**
 * Get cards filtered by sport
 */
export async function getCardsBySport(sport: SportFilter): Promise<CardData[]> {
  const cards = await getLocalCollection();
  if (sport === 'all') return cards;
  return cards.filter((c) => c.sport === sport);
}

/**
 * Get owned cards only
 */
export async function getOwnedCards(): Promise<CardData[]> {
  const cards = await getLocalCollection();
  return cards.filter((c) => c.isOwned);
}

/**
 * Get watchlist cards
 */
export async function getWatchlistCards(): Promise<CardData[]> {
  const cards = await getLocalCollection();
  return cards.filter((c) => c.isWatchlist);
}

/**
 * Get cards needing review
 */
export async function getFlaggedCards(): Promise<CardData[]> {
  const cards = await getLocalCollection();
  return cards.filter((c) => c.needsReview);
}

/**
 * Calculate collection statistics
 */
export async function getCollectionStats(): Promise<CollectionStats> {
  const cards = await getLocalCollection();
  const ownedCards = cards.filter((c) => c.isOwned);

  let totalValue = 0;
  let totalCost = 0;

  const bySport: CollectionStats['bySport'] = {
    football: { count: 0, value: 0 },
    basketball: { count: 0, value: 0 },
    soccer: { count: 0, value: 0 },
    baseball: { count: 0, value: 0 },
    hockey: { count: 0, value: 0 },
    other: { count: 0, value: 0 },
  };

  for (const card of ownedCards) {
    const value = card.pricing?.averageLast10 || 0;
    totalValue += value;
    if (card.purchasePrice) totalCost += card.purchasePrice;

    if (bySport[card.sport]) {
      bySport[card.sport].count++;
      bySport[card.sport].value += value;
    }
  }

  // Biggest movers - cards with largest price change in recent refresh
  const withPricing = ownedCards.filter(
    (c) => c.pricing?.lastSoldPrice && c.pricing?.averageLast10
  );
  const movers = withPricing
    .map((card) => ({
      card,
      change: Math.abs(
        ((card.pricing!.lastSoldPrice! - card.pricing!.averageLast10!) /
          card.pricing!.averageLast10!) *
          100
      ),
    }))
    .sort((a, b) => b.change - a.change)
    .slice(0, 5)
    .map((m) => m.card);

  // Recently scanned
  const recentlyScanned = [...ownedCards]
    .sort((a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime())
    .slice(0, 10);

  return {
    totalCards: ownedCards.length,
    totalValue: Math.round(totalValue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalProfitLoss: Math.round((totalValue - totalCost) * 100) / 100,
    bySport,
    biggestMovers: movers,
    recentlyScanned,
  };
}

// ========== PRICE ALERTS ==========

export async function getAlerts(): Promise<PriceAlert[]> {
  try {
    const data = await AsyncStorage.getItem(ALERTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addAlert(cardId: string, card: CardData): Promise<PriceAlert> {
  const alerts = await getAlerts();
  const alert: PriceAlert = {
    id: generateId(),
    cardId,
    card,
    targetPercentChange: 10,
    direction: 'both',
    lastCheckedPrice: card.pricing?.averageLast10 || 0,
    triggered: false,
    createdAt: new Date().toISOString(),
  };
  alerts.push(alert);
  await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  return alert;
}

export async function removeAlert(alertId: string): Promise<void> {
  const alerts = await getAlerts();
  const filtered = alerts.filter((a) => a.id !== alertId);
  await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(filtered));
}

export async function checkAlerts(cards: CardData[]): Promise<PriceAlert[]> {
  const alerts = await getAlerts();
  const triggeredAlerts: PriceAlert[] = [];

  const updatedAlerts = alerts.map((alert) => {
    const card = cards.find((c) => c.id === alert.cardId);
    if (!card?.pricing?.averageLast10) return alert;

    const currentPrice = card.pricing.averageLast10;
    const lastPrice = alert.lastCheckedPrice;

    if (lastPrice === 0) {
      return { ...alert, lastCheckedPrice: currentPrice };
    }

    const changePercent = ((currentPrice - lastPrice) / lastPrice) * 100;
    const absChange = Math.abs(changePercent);

    if (absChange >= alert.targetPercentChange) {
      const shouldTrigger =
        alert.direction === 'both' ||
        (alert.direction === 'up' && changePercent > 0) ||
        (alert.direction === 'down' && changePercent < 0);

      if (shouldTrigger) {
        const triggered = {
          ...alert,
          triggered: true,
          triggeredAt: new Date().toISOString(),
          lastCheckedPrice: currentPrice,
        };
        triggeredAlerts.push(triggered);
        return triggered;
      }
    }

    return { ...alert, lastCheckedPrice: currentPrice };
  });

  await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(updatedAlerts));
  return triggeredAlerts;
}

// ========== SUPABASE SYNC ==========

/**
 * Sync local collection to Supabase
 */
export async function syncToSupabase(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const cards = await getLocalCollection();

  for (const card of cards) {
    const record = cardToSupabaseRecord(card, user.id);

    if (card.supabaseId) {
      await supabase.from('cards').update(record).eq('id', card.supabaseId);
    } else {
      const { data } = await supabase.from('cards').insert(record).select('id').single();
      if (data) {
        await updateCard(card.id, { supabaseId: data.id });
      }
    }
  }
}

/**
 * Pull cards from Supabase to local
 */
export async function syncFromSupabase(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: remoteCards } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', user.id);

  if (!remoteCards) return;

  const localCards = await getLocalCollection();
  const localIds = new Set(localCards.map((c) => c.supabaseId));

  for (const remote of remoteCards) {
    if (!localIds.has(remote.id)) {
      const card = supabaseRecordToCard(remote);
      localCards.push(card);
    }
  }

  await saveLocalCollection(localCards);
}

function cardToSupabaseRecord(card: CardData, userId: string) {
  return {
    user_id: userId,
    local_id: card.id,
    player_name: card.playerName,
    year: card.year,
    set_name: card.set,
    card_number: card.cardNumber,
    sport: card.sport,
    edition: card.edition,
    edition_details: card.editionDetails,
    condition: card.condition,
    purchase_price: card.purchasePrice,
    scan_date: card.scanDate,
    image_uri: card.imageUri,
    thumbnail_uri: card.thumbnailUri,
    is_watchlist: card.isWatchlist,
    is_owned: card.isOwned,
    needs_review: card.needsReview,
    review_reason: card.reviewReason,
    notes: card.notes,
    last_sold_price: card.pricing?.lastSoldPrice,
    average_last_10: card.pricing?.averageLast10,
    thirty_day_high: card.pricing?.thirtyDayHigh,
    thirty_day_low: card.pricing?.thirtyDayLow,
    recommended_list_price: card.pricing?.recommendedListPrice,
    psa_graded_price: card.pricing?.psaGradedPrice,
    last_price_refresh: card.lastPriceRefreshDate,
    pricing_source: card.pricing?.source,
  };
}

function supabaseRecordToCard(record: any): CardData {
  return {
    id: record.local_id || generateId(),
    playerName: record.player_name,
    year: record.year || '',
    set: record.set_name || '',
    cardNumber: record.card_number || '',
    sport: record.sport || 'other',
    edition: record.edition || 'base',
    editionDetails: record.edition_details,
    condition: record.condition || 'raw',
    purchasePrice: record.purchase_price,
    scanDate: record.scan_date || new Date().toISOString(),
    imageUri: record.image_uri,
    thumbnailUri: record.thumbnail_uri,
    isWatchlist: record.is_watchlist || false,
    isOwned: record.is_owned ?? true,
    needsReview: record.needs_review || false,
    reviewReason: record.review_reason,
    notes: record.notes,
    supabaseId: record.id,
    pricing: record.last_sold_price
      ? {
          lastSoldPrice: record.last_sold_price,
          lastSoldDate: null,
          last10Sales: [],
          averageLast10: record.average_last_10,
          thirtyDayHigh: record.thirty_day_high,
          thirtyDayLow: record.thirty_day_low,
          recommendedListPrice: record.recommended_list_price,
          psaGradedPrice: record.psa_graded_price,
          estimatedNetPayout: null,
          shippingMethod: 'PWE',
          shippingCost: 4.99,
          ebayFee: 0,
          lastRefreshed: record.last_price_refresh || new Date().toISOString(),
          source: record.pricing_source || 'manual',
        }
      : null,
    lastPriceRefreshDate: record.last_price_refresh,
  };
}
