export type Sport = 'football' | 'basketball' | 'soccer' | 'baseball' | 'hockey' | 'other';

export type CardCondition = 'raw' | 'PSA 10' | 'PSA 9' | 'PSA 8' | 'PSA 7' | 'BGS 9.5' | 'BGS 10' | 'SGC 10';

export type CardEdition =
  | 'base'
  | 'rookie'
  | 'holo'
  | 'refractor'
  | 'prizm'
  | 'auto'
  | 'relic'
  | 'numbered'
  | 'parallel'
  | 'insert'
  | 'short-print'
  | 'super-short-print'
  | 'case-hit'
  | 'one-of-one'
  | 'other';

export interface SoldListing {
  title: string;
  soldPrice: number;
  soldDate: string;
  condition?: string;
  shippingCost?: number;
  imageUrl?: string;
}

export interface PricingData {
  lastSoldPrice: number | null;
  lastSoldDate: string | null;
  last10Sales: SoldListing[];
  averageLast10: number | null;
  thirtyDayHigh: number | null;
  thirtyDayLow: number | null;
  recommendedListPrice: number | null;
  psaGradedPrice: number | null;
  estimatedNetPayout: number | null;
  shippingMethod: 'PWE' | 'bubble_mailer';
  shippingCost: number;
  ebayFee: number;
  lastRefreshed: string;
  source: '130point' | 'scrapingbee' | 'manual';
}

export interface CardData {
  id: string;
  playerName: string;
  year: string;
  set: string;
  cardNumber: string;
  sport: Sport;
  edition: CardEdition;
  editionDetails?: string; // e.g. "/25" for numbered cards
  condition: CardCondition;
  purchasePrice: number | null;
  scanDate: string;
  imageUri?: string;
  thumbnailUri?: string;
  pricing: PricingData | null;
  lastPriceRefreshDate: string | null;
  isWatchlist: boolean;
  isOwned: boolean;
  needsReview: boolean;
  reviewReason?: string;
  notes?: string;
  userId?: string;
  supabaseId?: string;
}

export interface ScanResult {
  cards: CardData[];
  flaggedCards: CardData[];
  totalDetected: number;
  successfullyIdentified: number;
  imageUri: string;
}

export interface CollectionStats {
  totalCards: number;
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  bySport: Record<Sport, { count: number; value: number }>;
  biggestMovers: CardData[];
  recentlyScanned: CardData[];
}

export type SportFilter = 'all' | Sport;

export interface PriceAlert {
  id: string;
  cardId: string;
  card: CardData;
  targetPercentChange: number;
  direction: 'up' | 'down' | 'both';
  lastCheckedPrice: number;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
}
