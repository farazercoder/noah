import { EBAY_FEES, PRICING } from './constants';
import { CardData, PricingData, SoldListing } from '../types';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate pricing metrics from sold listings
 */
export function calculatePricing(
  soldListings: SoldListing[],
  psaGradedPrice?: number | null,
  source: '130point' | 'scrapingbee' | 'manual' = '130point'
): PricingData {
  if (soldListings.length === 0) {
    return {
      lastSoldPrice: null,
      lastSoldDate: null,
      last10Sales: [],
      averageLast10: null,
      thirtyDayHigh: null,
      thirtyDayLow: null,
      recommendedListPrice: null,
      psaGradedPrice: psaGradedPrice || null,
      estimatedNetPayout: null,
      shippingMethod: 'PWE',
      shippingCost: EBAY_FEES.PWE_SHIPPING,
      ebayFee: 0,
      lastRefreshed: new Date().toISOString(),
      source,
    };
  }

  // Sort by date, most recent first
  const sorted = [...soldListings].sort(
    (a, b) => new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime()
  );

  const last10 = sorted.slice(0, 10);
  const lastSold = sorted[0];

  // Average of last 10
  const avgLast10 =
    last10.reduce((sum, l) => sum + l.soldPrice, 0) / last10.length;

  // 30-day filter
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const last30Days = sorted.filter(
    (l) => new Date(l.soldDate) >= thirtyDaysAgo
  );

  const thirtyDayHigh =
    last30Days.length > 0 ? Math.max(...last30Days.map((l) => l.soldPrice)) : null;
  const thirtyDayLow =
    last30Days.length > 0 ? Math.min(...last30Days.map((l) => l.soldPrice)) : null;

  // Recommended list price = avg × 1.07
  const recommendedListPrice = avgLast10 * PRICING.RECOMMENDED_MARGIN;

  // Shipping method
  const shippingMethod = avgLast10 < EBAY_FEES.PWE_THRESHOLD ? 'PWE' : 'bubble_mailer';
  const shippingCost =
    shippingMethod === 'PWE' ? EBAY_FEES.PWE_SHIPPING : EBAY_FEES.BUBBLE_MAILER_SHIPPING;

  // eBay fee on total (price + shipping)
  const totalSale = recommendedListPrice + shippingCost;
  const ebayFee = totalSale * EBAY_FEES.FINAL_VALUE_FEE_PERCENT;

  // Net payout
  const estimatedNetPayout = totalSale - ebayFee - shippingCost;

  return {
    lastSoldPrice: lastSold.soldPrice,
    lastSoldDate: lastSold.soldDate,
    last10Sales: last10,
    averageLast10: Math.round(avgLast10 * 100) / 100,
    thirtyDayHigh: thirtyDayHigh ? Math.round(thirtyDayHigh * 100) / 100 : null,
    thirtyDayLow: thirtyDayLow ? Math.round(thirtyDayLow * 100) / 100 : null,
    recommendedListPrice: Math.round(recommendedListPrice * 100) / 100,
    psaGradedPrice: psaGradedPrice || null,
    estimatedNetPayout: Math.round(estimatedNetPayout * 100) / 100,
    shippingMethod,
    shippingCost,
    ebayFee: Math.round(ebayFee * 100) / 100,
    lastRefreshed: new Date().toISOString(),
    source,
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '--';
  return `$${amount.toFixed(2)}`;
}

/**
 * Format date to readable string
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format relative time
 */
export function timeAgo(dateStr: string): string {
  const now = new Date().getTime();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

/**
 * Generate eBay listing title
 */
export function generateEbayTitle(card: CardData): string {
  const parts: string[] = [];

  if (card.year) parts.push(card.year);
  if (card.set) parts.push(card.set);
  if (card.playerName) parts.push(card.playerName);
  if (card.cardNumber) parts.push(`#${card.cardNumber}`);

  if (card.edition && card.edition !== 'base') {
    const editionLabel = card.edition.charAt(0).toUpperCase() + card.edition.slice(1);
    parts.push(editionLabel);
  }
  if (card.editionDetails) parts.push(card.editionDetails);

  if (card.condition === 'raw') {
    parts.push('Raw NM-MT');
  } else {
    parts.push(card.condition);
  }

  // eBay titles max 80 chars
  let title = parts.join(' ');
  if (title.length > 80) {
    title = title.substring(0, 77) + '...';
  }

  return title;
}

/**
 * Build search query for pricing lookups
 */
export function buildSearchQuery(card: CardData): string {
  const parts = [card.year, card.set, card.playerName, card.cardNumber].filter(Boolean);
  if (card.edition && card.edition !== 'base') {
    parts.push(card.edition);
  }
  return parts.join(' ');
}

/**
 * Calculate profit/loss for a card
 */
export function calculateProfitLoss(card: CardData): number | null {
  if (card.purchasePrice == null || card.pricing?.averageLast10 == null) {
    return null;
  }
  return card.pricing.averageLast10 - card.purchasePrice;
}

/**
 * Get sport color
 */
export function getSportColor(sport: string): string {
  const colors: Record<string, string> = {
    football: '#4CAF50',
    basketball: '#FF9800',
    soccer: '#2196F3',
    baseball: '#F44336',
    hockey: '#9C27B0',
    other: '#607D8B',
  };
  return colors[sport] || colors.other;
}

/**
 * Calculate price change percentage
 */
export function priceChangePercent(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Check if cache is stale (older than 24 hours)
 */
export function isCacheStale(lastRefreshed: string | null): boolean {
  if (!lastRefreshed) return true;
  const refreshedAt = new Date(lastRefreshed).getTime();
  return Date.now() - refreshedAt > PRICING.CACHE_TTL_MS;
}
