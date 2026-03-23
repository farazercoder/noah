import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { API_KEYS } from '../utils/constants';

let _supabase: SupabaseClient | null = null;

/**
 * Get the Supabase client. Returns null if credentials aren't configured.
 * Lazy-initialized to avoid fetch errors on startup when using placeholder keys.
 */
export function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const url = API_KEYS.SUPABASE_URL;
  const key = API_KEYS.SUPABASE_ANON_KEY;

  // Don't create client with placeholder values
  if (!url || !key || url.includes('YOUR_') || key.includes('YOUR_')) {
    return null;
  }

  _supabase = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _supabase;
}

/**
 * Supabase table schema (for reference — run this SQL in Supabase dashboard):
 *
 * CREATE TABLE cards (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id),
 *   local_id TEXT NOT NULL,
 *   player_name TEXT NOT NULL,
 *   year TEXT,
 *   set_name TEXT,
 *   card_number TEXT,
 *   sport TEXT NOT NULL DEFAULT 'other',
 *   edition TEXT DEFAULT 'base',
 *   edition_details TEXT,
 *   condition TEXT DEFAULT 'raw',
 *   purchase_price DECIMAL(10,2),
 *   scan_date TIMESTAMPTZ DEFAULT NOW(),
 *   image_uri TEXT,
 *   thumbnail_uri TEXT,
 *   is_watchlist BOOLEAN DEFAULT FALSE,
 *   is_owned BOOLEAN DEFAULT TRUE,
 *   needs_review BOOLEAN DEFAULT FALSE,
 *   review_reason TEXT,
 *   notes TEXT,
 *   last_sold_price DECIMAL(10,2),
 *   average_last_10 DECIMAL(10,2),
 *   thirty_day_high DECIMAL(10,2),
 *   thirty_day_low DECIMAL(10,2),
 *   recommended_list_price DECIMAL(10,2),
 *   psa_graded_price DECIMAL(10,2),
 *   last_price_refresh TIMESTAMPTZ,
 *   pricing_source TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE TABLE price_alerts (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id),
 *   card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
 *   target_percent_change DECIMAL(5,2) DEFAULT 10.0,
 *   direction TEXT DEFAULT 'both',
 *   last_checked_price DECIMAL(10,2),
 *   triggered BOOLEAN DEFAULT FALSE,
 *   triggered_at TIMESTAMPTZ,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- Enable Row Level Security
 * ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
 *
 * -- Policies
 * CREATE POLICY "Users can manage own cards"
 *   ON cards FOR ALL
 *   USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can manage own alerts"
 *   ON price_alerts FOR ALL
 *   USING (auth.uid() = user_id);
 *
 * -- Indexes
 * CREATE INDEX idx_cards_user ON cards(user_id);
 * CREATE INDEX idx_cards_sport ON cards(sport);
 * CREATE INDEX idx_cards_watchlist ON cards(is_watchlist);
 * CREATE INDEX idx_alerts_card ON price_alerts(card_id);
 */
