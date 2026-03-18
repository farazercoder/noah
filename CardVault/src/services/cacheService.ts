import AsyncStorage from '@react-native-async-storage/async-storage';
import { PricingData } from '../types';
import { PRICING } from '../utils/constants';

const CACHE_PREFIX = 'pricing_cache_';
const CACHE_INDEX_KEY = 'pricing_cache_index';

/**
 * Get cached pricing data for a card
 */
export async function getCachedPricing(cardId: string): Promise<PricingData | null> {
  try {
    const key = `${CACHE_PREFIX}${cardId}`;
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;

    const parsed: PricingData = JSON.parse(data);

    // Check if cache is expired
    const refreshedAt = new Date(parsed.lastRefreshed).getTime();
    if (Date.now() - refreshedAt > PRICING.CACHE_TTL_MS) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Store pricing data in cache
 */
export async function setCachedPricing(cardId: string, pricing: PricingData): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${cardId}`;
    await AsyncStorage.setItem(key, JSON.stringify(pricing));

    // Update cache index
    const indexStr = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];
    if (!index.includes(cardId)) {
      index.push(cardId);
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
    }
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

/**
 * Clear all pricing cache
 */
export async function clearPricingCache(): Promise<void> {
  try {
    const indexStr = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];

    const keys = index.map((id) => `${CACHE_PREFIX}${id}`);
    for (const key of [...keys, CACHE_INDEX_KEY]) {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

/**
 * Clear expired cache entries
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const indexStr = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];

    let removed = 0;
    const validIds: string[] = [];

    for (const cardId of index) {
      const key = `${CACHE_PREFIX}${cardId}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        const parsed: PricingData = JSON.parse(data);
        const refreshedAt = new Date(parsed.lastRefreshed).getTime();

        if (Date.now() - refreshedAt > PRICING.CACHE_TTL_MS) {
          await AsyncStorage.removeItem(key);
          removed++;
        } else {
          validIds.push(cardId);
        }
      }
    }

    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(validIds));
    return removed;
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return 0;
  }
}
