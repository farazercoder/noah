import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  CardData,
  CollectionStats,
  SportFilter,
  PriceAlert,
  PricingData,
} from '../types';
import {
  getLocalCollection,
  addCards,
  updateCard,
  deleteCard,
  getCardsBySport,
  getOwnedCards,
  getWatchlistCards,
  getFlaggedCards,
  getCollectionStats,
  getAlerts,
  addAlert,
  removeAlert,
  checkAlerts,
} from '../services/collectionService';
import { fetchCardPricing, fetchBatchPricing } from '../services/pricingService';

interface CollectionContextType {
  cards: CardData[];
  stats: CollectionStats | null;
  alerts: PriceAlert[];
  triggeredAlerts: PriceAlert[];
  sportFilter: SportFilter;
  isLoading: boolean;
  isRefreshingPrices: boolean;
  priceRefreshProgress: { completed: number; total: number } | null;

  // Actions
  loadCollection: () => Promise<void>;
  addNewCards: (cards: CardData[]) => Promise<void>;
  updateCardData: (cardId: string, updates: Partial<CardData>) => Promise<void>;
  removeCard: (cardId: string) => Promise<void>;
  setSportFilter: (filter: SportFilter) => void;
  refreshPricing: (cardId?: string) => Promise<void>;
  toggleWatchlist: (cardId: string) => Promise<void>;
  addPriceAlert: (cardId: string) => Promise<void>;
  removePriceAlert: (alertId: string) => Promise<void>;
  getFilteredCards: () => CardData[];
  getOwnedCardsList: () => CardData[];
  getWatchlistCardsList: () => CardData[];
  getFlaggedCardsList: () => CardData[];
  dismissTriggeredAlert: (alertId: string) => void;
}

const CollectionContext = createContext<CollectionContextType | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<CardData[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<PriceAlert[]>([]);
  const [sportFilter, setSportFilter] = useState<SportFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [priceRefreshProgress, setPriceRefreshProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  const loadCollection = useCallback(async () => {
    setIsLoading(true);
    try {
      const allCards = await getLocalCollection();
      setCards(allCards);
      const collectionStats = await getCollectionStats();
      setStats(collectionStats);
      const allAlerts = await getAlerts();
      setAlerts(allAlerts);
    } catch (error) {
      console.error('Failed to load collection:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const addNewCards = useCallback(
    async (newCards: CardData[]) => {
      await addCards(newCards);
      await loadCollection();
    },
    [loadCollection]
  );

  const updateCardData = useCallback(
    async (cardId: string, updates: Partial<CardData>) => {
      await updateCard(cardId, updates);
      await loadCollection();
    },
    [loadCollection]
  );

  const removeCard = useCallback(
    async (cardId: string) => {
      await deleteCard(cardId);
      await loadCollection();
    },
    [loadCollection]
  );

  const refreshPricing = useCallback(
    async (cardId?: string) => {
      setIsRefreshingPrices(true);
      try {
        if (cardId) {
          const card = cards.find((c) => c.id === cardId);
          if (card) {
            const pricing = await fetchCardPricing(card);
            await updateCard(cardId, {
              pricing,
              lastPriceRefreshDate: new Date().toISOString(),
            });
          }
        } else {
          // Refresh all owned cards
          const owned = cards.filter((c) => c.isOwned);
          const pricingMap = await fetchBatchPricing(owned, (completed, total) => {
            setPriceRefreshProgress({ completed, total });
          });

          for (const [id, pricing] of pricingMap) {
            await updateCard(id, {
              pricing,
              lastPriceRefreshDate: new Date().toISOString(),
            });
          }
        }

        // Check alerts after price refresh
        const allCards = await getLocalCollection();
        const triggered = await checkAlerts(allCards);
        if (triggered.length > 0) {
          setTriggeredAlerts((prev) => [...prev, ...triggered]);
        }

        await loadCollection();
      } finally {
        setIsRefreshingPrices(false);
        setPriceRefreshProgress(null);
      }
    },
    [cards, loadCollection]
  );

  const toggleWatchlist = useCallback(
    async (cardId: string) => {
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        await updateCard(cardId, { isWatchlist: !card.isWatchlist });
        await loadCollection();
      }
    },
    [cards, loadCollection]
  );

  const addPriceAlert = useCallback(
    async (cardId: string) => {
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        const alert = await addAlert(cardId, card);
        setAlerts((prev) => [...prev, alert]);
      }
    },
    [cards]
  );

  const removePriceAlert = useCallback(
    async (alertId: string) => {
      await removeAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    },
    []
  );

  const dismissTriggeredAlert = useCallback((alertId: string) => {
    setTriggeredAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const getFilteredCards = useCallback(() => {
    if (sportFilter === 'all') return cards;
    return cards.filter((c) => c.sport === sportFilter);
  }, [cards, sportFilter]);

  const getOwnedCardsList = useCallback(() => {
    return cards.filter((c) => c.isOwned);
  }, [cards]);

  const getWatchlistCardsList = useCallback(() => {
    return cards.filter((c) => c.isWatchlist);
  }, [cards]);

  const getFlaggedCardsList = useCallback(() => {
    return cards.filter((c) => c.needsReview);
  }, [cards]);

  return (
    <CollectionContext.Provider
      value={{
        cards,
        stats,
        alerts,
        triggeredAlerts,
        sportFilter,
        isLoading,
        isRefreshingPrices,
        priceRefreshProgress,
        loadCollection,
        addNewCards,
        updateCardData,
        removeCard,
        setSportFilter,
        refreshPricing,
        toggleWatchlist,
        addPriceAlert,
        removePriceAlert,
        getFilteredCards,
        getOwnedCardsList,
        getWatchlistCardsList,
        getFlaggedCardsList,
        dismissTriggeredAlert,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection() {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error('useCollection must be used within a CollectionProvider');
  }
  return context;
}
