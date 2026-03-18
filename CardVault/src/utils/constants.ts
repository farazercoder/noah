// API Keys - Replace with your actual keys
// In production, these should be in environment variables
export const API_KEYS = {
  CLAUDE_API_KEY: process.env.EXPO_PUBLIC_CLAUDE_API_KEY || 'YOUR_CLAUDE_API_KEY',
  SCRAPINGBEE_API_KEY: process.env.EXPO_PUBLIC_SCRAPINGBEE_API_KEY || 'YOUR_SCRAPINGBEE_API_KEY',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
};

// eBay fee structure
export const EBAY_FEES = {
  FINAL_VALUE_FEE_PERCENT: 0.1325, // 13.25%
  PWE_SHIPPING: 4.99,
  BUBBLE_MAILER_SHIPPING: 8.99,
  PWE_THRESHOLD: 20, // Cards under $20 ship PWE
};

// Pricing
export const PRICING = {
  RECOMMENDED_MARGIN: 1.07, // 7% above average
  CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  PRICE_ALERT_THRESHOLD: 0.10, // 10% movement
};

// Claude Vision
export const CLAUDE = {
  MODEL: 'claude-sonnet-4-20250514',
  MAX_TOKENS: 4096,
};

// 130point
export const ONEPOINT = {
  BASE_URL: 'https://130point.com/sales/',
  SEARCH_URL: 'https://130point.com/sales/search.php',
};

// App colors - ESPN meets eBay aesthetic
export const COLORS = {
  // Primary
  primary: '#1A1A2E',
  primaryLight: '#16213E',
  accent: '#E94560',
  accentLight: '#FF6B6B',

  // Backgrounds
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceLight: '#252542',
  surfaceHighlight: '#2D2D4A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6B6B80',

  // Status
  success: '#00C853',
  warning: '#FFD600',
  error: '#FF1744',
  info: '#2196F3',

  // Sport colors
  football: '#4CAF50',
  basketball: '#FF9800',
  soccer: '#2196F3',
  baseball: '#F44336',
  hockey: '#9C27B0',
  other: '#607D8B',

  // Card
  cardBorder: '#2D2D4A',
  cardShadow: 'rgba(0, 0, 0, 0.3)',

  // Price
  priceUp: '#00C853',
  priceDown: '#FF1744',
  priceNeutral: '#A0A0B8',
};

export const FONTS = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    hero: 40,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  round: 999,
};

export const SPORTS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  football: { label: 'Football', color: COLORS.football, icon: 'american-football' },
  basketball: { label: 'Basketball', color: COLORS.basketball, icon: 'basketball' },
  soccer: { label: 'Soccer', color: COLORS.soccer, icon: 'football' },
  baseball: { label: 'Baseball', color: COLORS.baseball, icon: 'baseball' },
  hockey: { label: 'Hockey', color: COLORS.hockey, icon: 'hockey-puck' },
  other: { label: 'Other', color: COLORS.other, icon: 'trophy' },
};
