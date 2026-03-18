import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCollection } from '../context/CollectionContext';
import { CardGridItem } from '../components/CardGridItem';
import { SportFilterBar } from '../components/SportFilterBar';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';
import { formatCurrency } from '../utils/helpers';
import { CardData } from '../types';

type SortOption = 'recent' | 'value-high' | 'value-low' | 'name' | 'sport';

export function CollectionScreen() {
  const navigation = useNavigation<any>();
  const { cards, stats, sportFilter, setSportFilter } = useCollection();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showOwnedOnly, setShowOwnedOnly] = useState(true);

  const screenWidth = Dimensions.get('window').width;
  const isLandscape = screenWidth > 800;
  const numColumns = isLandscape ? 5 : 3;

  const filteredCards = useMemo(() => {
    let result = cards;

    // Filter owned vs all
    if (showOwnedOnly) {
      result = result.filter((c) => c.isOwned);
    }

    // Sport filter
    if (sportFilter !== 'all') {
      result = result.filter((c) => c.sport === sportFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.playerName.toLowerCase().includes(q) ||
          c.set.toLowerCase().includes(q) ||
          c.year.includes(q) ||
          c.cardNumber.includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result = [...result].sort(
          (a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime()
        );
        break;
      case 'value-high':
        result = [...result].sort(
          (a, b) => (b.pricing?.averageLast10 || 0) - (a.pricing?.averageLast10 || 0)
        );
        break;
      case 'value-low':
        result = [...result].sort(
          (a, b) => (a.pricing?.averageLast10 || 0) - (b.pricing?.averageLast10 || 0)
        );
        break;
      case 'name':
        result = [...result].sort((a, b) => a.playerName.localeCompare(b.playerName));
        break;
      case 'sport':
        result = [...result].sort((a, b) => a.sport.localeCompare(b.sport));
        break;
    }

    return result;
  }, [cards, sportFilter, searchQuery, sortBy, showOwnedOnly]);

  const handleCardPress = (card: CardData) => {
    navigation.navigate('CardDetail', { cardId: card.id });
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Collection</Text>
        <Text style={styles.count}>
          {filteredCards.length} cards | {formatCurrency(stats?.totalValue || 0)}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search player, set, year..."
          placeholderTextColor={COLORS.textMuted}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sport Filter */}
      <SportFilterBar activeFilter={sportFilter} onFilterChange={setSportFilter} />

      {/* Sort and Filter Bar */}
      <View style={styles.sortBar}>
        <View style={styles.sortOptions}>
          {(['recent', 'value-high', 'value-low', 'name'] as SortOption[]).map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.sortChip, sortBy === option && styles.sortChipActive]}
              onPress={() => setSortBy(option)}
            >
              <Text style={[styles.sortChipText, sortBy === option && styles.sortChipTextActive]}>
                {option === 'recent'
                  ? 'Recent'
                  : option === 'value-high'
                  ? 'Value ↓'
                  : option === 'value-low'
                  ? 'Value ↑'
                  : 'Name'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.ownedToggle, showOwnedOnly && styles.ownedToggleActive]}
          onPress={() => setShowOwnedOnly(!showOwnedOnly)}
        >
          <Text style={[styles.ownedToggleText, showOwnedOnly && styles.ownedToggleTextActive]}>
            Owned Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card Grid */}
      <FlatList
        data={filteredCards}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns} // Force re-render on column count change
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <CardGridItem card={item} onPress={handleCardPress} columnCount={numColumns} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No cards match your search' : 'No cards in collection yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xxl, paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes.xxxl, fontWeight: FONTS.weights.heavy, color: COLORS.textPrimary,
  },
  count: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, marginHorizontal: SPACING.xl,
    marginVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1, paddingVertical: SPACING.md, color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
  },
  sortBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
  },
  sortOptions: { flexDirection: 'row', gap: SPACING.xs },
  sortChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round, backgroundColor: COLORS.surface,
  },
  sortChipActive: { backgroundColor: COLORS.surfaceHighlight },
  sortChipText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  sortChipTextActive: { color: COLORS.textPrimary, fontWeight: FONTS.weights.semibold },
  ownedToggle: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  ownedToggleActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  ownedToggleText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  ownedToggleTextActive: { color: COLORS.textPrimary, fontWeight: FONTS.weights.bold },
  grid: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm },
  gridRow: { gap: SPACING.md },
  emptyState: {
    alignItems: 'center', paddingVertical: 60,
  },
  emptyText: {
    fontSize: FONTS.sizes.md, color: COLORS.textMuted, marginTop: SPACING.md,
  },
});
