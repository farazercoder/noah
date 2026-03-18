import { API_KEYS, CLAUDE } from '../utils/constants';
import { CardData, ScanResult, Sport, CardEdition } from '../types';
import { generateId } from '../utils/helpers';

const SYSTEM_PROMPT = `You are a sports card identification expert. You analyze images of sports cards and identify every card visible in the frame.

For each card you can identify, extract:
- playerName: The player's full name
- year: The year printed on the card (e.g., "2023")
- set: The card set/series (e.g., "Panini Prizm", "Topps Chrome", "Bowman 1st")
- cardNumber: The card number (e.g., "101", "RC-5")
- sport: One of: football, basketball, soccer, baseball, hockey, other
- edition: One of: base, rookie, holo, refractor, prizm, auto, relic, numbered, parallel, insert, short-print, super-short-print, case-hit, one-of-one, other
- editionDetails: Any additional detail like "/25" for numbered cards, "Silver" for silver prizm, etc.
- confidence: A number from 0 to 1 indicating how confident you are in the identification
- reviewReason: If confidence < 0.8, explain what was unclear (glare, partial visibility, etc.)

Handle:
- Binder pages with multiple cards visible
- Cards in top-loaders or penny sleeves
- Loose cards
- Partial visibility and glare - do your best and flag low confidence

Return a JSON array of identified cards. Even if you can only partially identify a card, include it with whatever info you can extract and set confidence accordingly.`;

interface ClaudeCardResult {
  playerName: string;
  year: string;
  set: string;
  cardNumber: string;
  sport: Sport;
  edition: CardEdition;
  editionDetails?: string;
  confidence: number;
  reviewReason?: string;
}

/**
 * Send an image to Claude Vision for card identification
 */
export async function identifyCardsFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ScanResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEYS.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE.MODEL,
        max_tokens: CLAUDE.MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: 'Identify every sports card visible in this image. Return ONLY a JSON array of card objects with the fields specified. No other text.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '[]';

    // Parse the JSON response
    let parsedCards: ClaudeCardResult[];
    try {
      // Try to extract JSON from the response (in case Claude adds text around it)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      parsedCards = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error('Failed to parse Claude response:', content);
      parsedCards = [];
    }

    // Convert to CardData objects
    const allCards: CardData[] = parsedCards.map((result) => ({
      id: generateId(),
      playerName: result.playerName || 'Unknown',
      year: result.year || '',
      set: result.set || '',
      cardNumber: result.cardNumber || '',
      sport: result.sport || 'other',
      edition: result.edition || 'base',
      editionDetails: result.editionDetails,
      condition: 'raw',
      purchasePrice: null,
      scanDate: new Date().toISOString(),
      pricing: null,
      lastPriceRefreshDate: null,
      isWatchlist: false,
      isOwned: true,
      needsReview: result.confidence < 0.8,
      reviewReason: result.reviewReason,
    }));

    const flaggedCards = allCards.filter((c) => c.needsReview);
    const confirmedCards = allCards.filter((c) => !c.needsReview);

    return {
      cards: confirmedCards,
      flaggedCards,
      totalDetected: allCards.length,
      successfullyIdentified: confirmedCards.length,
      imageUri: '',
    };
  } catch (error) {
    console.error('Card identification error:', error);
    throw error;
  }
}

/**
 * Process multiple frames from a video scan
 */
export async function identifyCardsFromVideoFrames(
  frames: { base64: string; mimeType: string }[]
): Promise<ScanResult> {
  const allCards: CardData[] = [];
  const allFlagged: CardData[] = [];

  // Process frames in batches of 3 to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < frames.length; i += batchSize) {
    const batch = frames.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((frame) => identifyCardsFromImage(frame.base64, frame.mimeType))
    );

    for (const result of results) {
      allCards.push(...result.cards);
      allFlagged.push(...result.flaggedCards);
    }
  }

  // Deduplicate by player name + year + card number
  const seen = new Set<string>();
  const uniqueCards = allCards.filter((card) => {
    const key = `${card.playerName}-${card.year}-${card.cardNumber}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const uniqueFlagged = allFlagged.filter((card) => {
    const key = `${card.playerName}-${card.year}-${card.cardNumber}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    cards: uniqueCards,
    flaggedCards: uniqueFlagged,
    totalDetected: uniqueCards.length + uniqueFlagged.length,
    successfullyIdentified: uniqueCards.length,
    imageUri: '',
  };
}
