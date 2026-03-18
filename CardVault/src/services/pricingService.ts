import { API_KEYS, ONEPOINT } from '../utils/constants';
import { CardData, SoldListing, PricingData } from '../types';
import { buildSearchQuery, calculatePricing, isCacheStale } from '../utils/helpers';
import { getCachedPricing, setCachedPricing } from './cacheService';

/**
 * Fetch pricing for a card, using cache if available
 */
export async function fetchCardPricing(card: CardData): Promise<PricingData> {
  // Check cache first
  const cached = await getCachedPricing(card.id);
  if (cached && !isCacheStale(cached.lastRefreshed)) {
    return cached;
  }

  // Try 130point first
  try {
    const listings = await fetch130PointData(card);
    if (listings.length > 0) {
      const psaPrice = await fetchPSAPrice(card);
      const pricing = calculatePricing(listings, psaPrice, '130point');
      await setCachedPricing(card.id, pricing);
      return pricing;
    }
  } catch (error) {
    console.warn('130point lookup failed, falling back to ScrapingBee:', error);
  }

  // Fallback to ScrapingBee
  try {
    const listings = await fetchScrapingBeeData(card);
    if (listings.length > 0) {
      const psaPrice = await fetchPSAPrice(card);
      const pricing = calculatePricing(listings, psaPrice, 'scrapingbee');
      await setCachedPricing(card.id, pricing);
      return pricing;
    }
  } catch (error) {
    console.warn('ScrapingBee lookup failed:', error);
  }

  // Return empty pricing if both fail
  const emptyPricing = calculatePricing([], null, 'manual');
  return emptyPricing;
}

/**
 * Fetch sold data from 130point.com
 */
async function fetch130PointData(card: CardData): Promise<SoldListing[]> {
  const query = buildSearchQuery(card);

  // 130point.com search endpoint
  // They provide a search interface for sold eBay sports card data
  const searchUrl = `${ONEPOINT.SEARCH_URL}`;

  try {
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CardVault/1.0',
      },
      body: new URLSearchParams({
        search: query,
        sport: mapSportTo130Point(card.sport),
        year: card.year || '',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`130point returned ${response.status}`);
    }

    const html = await response.text();
    return parse130PointResults(html);
  } catch (error) {
    console.error('130point fetch error:', error);
    throw error;
  }
}

/**
 * Parse 130point HTML results into SoldListing objects
 */
function parse130PointResults(html: string): SoldListing[] {
  const listings: SoldListing[] = [];

  // 130point returns a table of sold listings
  // Parse the HTML to extract sold price, date, title, and condition
  // Using regex-based parsing since we're in React Native without DOM access

  // Match table rows with sold data
  const rowRegex = /<tr[^>]*class="[^"]*sold[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  const priceRegex = /\$[\d,]+\.?\d{0,2}/g;
  const dateRegex = /\d{1,2}\/\d{1,2}\/\d{2,4}/g;
  const titleRegex = /<a[^>]*>([\s\S]*?)<\/a>/i;

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];

    const prices = rowHtml.match(priceRegex);
    const dates = rowHtml.match(dateRegex);
    const titleMatch = rowHtml.match(titleRegex);

    if (prices && prices.length > 0) {
      const soldPrice = parseFloat(prices[0].replace(/[$,]/g, ''));
      const shippingCost = prices.length > 1
        ? parseFloat(prices[1].replace(/[$,]/g, ''))
        : 0;

      listings.push({
        title: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Unknown',
        soldPrice,
        soldDate: dates?.[0] ? normalizeDate(dates[0]) : new Date().toISOString(),
        shippingCost,
      });
    }
  }

  // If regex parsing didn't find structured rows, try a simpler approach
  if (listings.length === 0) {
    const allPrices = html.match(/\$[\d,]+\.?\d{0,2}/g) || [];
    const allDates = html.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g) || [];

    for (let i = 0; i < Math.min(allPrices.length, 20); i++) {
      const price = parseFloat(allPrices[i].replace(/[$,]/g, ''));
      if (price > 0 && price < 100000) {
        listings.push({
          title: 'eBay Sold Listing',
          soldPrice: price,
          soldDate: allDates[i] ? normalizeDate(allDates[i]) : new Date().toISOString(),
        });
      }
    }
  }

  return listings;
}

/**
 * Normalize date string to ISO format
 */
function normalizeDate(dateStr: string): string {
  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let year = parts[2];
      if (year.length === 2) year = `20${year}`;
      return new Date(`${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`).toISOString();
    }
    return new Date(dateStr).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Map sport to 130point's sport filter values
 */
function mapSportTo130Point(sport: string): string {
  const map: Record<string, string> = {
    football: 'football',
    basketball: 'basketball',
    soccer: 'soccer',
    baseball: 'baseball',
    hockey: 'hockey',
    other: '',
  };
  return map[sport] || '';
}

/**
 * Fallback: Fetch sold eBay data via ScrapingBee
 */
async function fetchScrapingBeeData(card: CardData): Promise<SoldListing[]> {
  const query = buildSearchQuery(card);

  // eBay completed/sold listings URL
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&_sop=13`;

  const scrapingBeeUrl = `https://app.scrapingbee.com/api/v1/?api_key=${API_KEYS.SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(ebayUrl)}&render_js=false&premium_proxy=true`;

  try {
    const response = await fetch(scrapingBeeUrl);

    if (!response.ok) {
      throw new Error(`ScrapingBee returned ${response.status}`);
    }

    const html = await response.text();
    return parseEbayResults(html);
  } catch (error) {
    console.error('ScrapingBee fetch error:', error);
    throw error;
  }
}

/**
 * Parse eBay sold listings HTML
 */
function parseEbayResults(html: string): SoldListing[] {
  const listings: SoldListing[] = [];

  // eBay sold listings structure
  // Each item is in an s-item container
  const itemRegex = /s-item__wrapper[\s\S]*?(?=s-item__wrapper|$)/g;
  const titleRegex = /s-item__title[^>]*>[\s]*(?:<span[^>]*>)?([\s\S]*?)(?:<\/span>)?<\//i;
  const priceRegex = /s-item__price[^>]*>[\s]*(?:<span[^>]*>)?\$([\d,]+\.?\d{0,2})/i;
  const dateRegex = /POSITIVE[^>]*>Sold\s+([\w]+\s+\d+,?\s*\d{0,4})/i;
  const shippingRegex = /s-item__shipping[^>]*>[^$]*\$([\d,]+\.?\d{0,2})/i;

  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    const itemHtml = match[0];

    const titleMatch = itemHtml.match(titleRegex);
    const priceMatch = itemHtml.match(priceRegex);
    const dateMatch = itemHtml.match(dateRegex);
    const shippingMatch = itemHtml.match(shippingRegex);

    if (priceMatch) {
      const soldPrice = parseFloat(priceMatch[1].replace(/,/g, ''));

      listings.push({
        title: titleMatch
          ? titleMatch[1].replace(/<[^>]*>/g, '').trim()
          : 'eBay Listing',
        soldPrice,
        soldDate: dateMatch
          ? new Date(dateMatch[1]).toISOString()
          : new Date().toISOString(),
        shippingCost: shippingMatch
          ? parseFloat(shippingMatch[1].replace(/,/g, ''))
          : undefined,
      });
    }
  }

  return listings.slice(0, 20); // Cap at 20 results
}

/**
 * Fetch PSA graded price for comparison
 * Uses ScrapingBee to search eBay for PSA graded version
 */
async function fetchPSAPrice(card: CardData): Promise<number | null> {
  try {
    const query = `${buildSearchQuery(card)} PSA 10`;
    const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&_sop=13`;

    const scrapingBeeUrl = `https://app.scrapingbee.com/api/v1/?api_key=${API_KEYS.SCRAPINGBEE_API_KEY}&url=${encodeURIComponent(ebayUrl)}&render_js=false`;

    const response = await fetch(scrapingBeeUrl);
    if (!response.ok) return null;

    const html = await response.text();
    const listings = parseEbayResults(html);

    if (listings.length === 0) return null;

    // Return average of first 5 PSA results
    const topListings = listings.slice(0, 5);
    const avg = topListings.reduce((sum, l) => sum + l.soldPrice, 0) / topListings.length;
    return Math.round(avg * 100) / 100;
  } catch {
    return null;
  }
}

/**
 * Batch fetch pricing for multiple cards
 */
export async function fetchBatchPricing(
  cards: CardData[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, PricingData>> {
  const results = new Map<string, PricingData>();

  // Process in batches of 5 to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((card) => fetchCardPricing(card))
    );

    batchResults.forEach((result, index) => {
      const card = batch[index];
      if (result.status === 'fulfilled') {
        results.set(card.id, result.value);
      }
    });

    onProgress?.(Math.min(i + batchSize, cards.length), cards.length);

    // Small delay between batches
    if (i + batchSize < cards.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}
