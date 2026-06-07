import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, radii } from '../../theme';
import { recipes, Recipe } from '../data/recipes';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORIES = ['Alle', 'Vorspeise', 'Hauptgang', 'Nachspeise'] as const;
const CUISINES = ['Alle', 'Italienisch', 'Französisch', 'Deutsch', 'Spanisch', 'Asiatisch', 'International'] as const;
const OCCASIONS = ['Alle', 'Romantisch', 'Familienessen', 'Grillabend', 'Festlich', 'Alltag'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Vorspeise: '#4a7c59',
  Hauptgang: '#7c2535',
  Nachspeise: '#8a6020',
};

type FilterState = {
  category: string;
  cuisine: string;
  occasion: string;
};

function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: recipe.image }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardOverlay} />
      <View style={styles.cardContent}>
        <View style={styles.cardBadgeRow}>
          <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[recipe.category] }]}>
            <Text style={styles.badgeText}>{recipe.category}</Text>
          </View>
          <View style={styles.cuisineBadge}>
            <Text style={styles.cuisineText}>{recipe.cuisine}</Text>
          </View>
        </View>
        <Text style={styles.cardName}>{recipe.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{recipe.description}</Text>
      </View>
    </TouchableOpacity>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function RecipesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    category: 'Alle',
    cuisine: 'Alle',
    occasion: 'Alle',
  });
  const [pendingFilters, setPendingFilters] = useState<FilterState>(filters);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const openFilter = () => {
    setPendingFilters(filters);
    setFilterVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 120,
    }).start();
  };

  const closeFilter = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setFilterVisible(false));
  };

  const applyFilters = () => {
    setFilters(pendingFilters);
    closeFilter();
  };

  const resetFilters = () => {
    const empty: FilterState = { category: 'Alle', cuisine: 'Alle', occasion: 'Alle' };
    setPendingFilters(empty);
  };

  const activeFilterCount = [filters.category, filters.cuisine, filters.occasion].filter(
    (v) => v !== 'Alle'
  ).length;

  const filtered = useMemo(() => {
    return recipes
      .filter((r) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q);
        const matchCat = filters.category === 'Alle' || r.category === filters.category;
        const matchCuisine = filters.cuisine === 'Alle' || r.cuisine === filters.cuisine;
        const matchOccasion =
          filters.occasion === 'Alle' || r.occasion.includes(filters.occasion);
        return matchSearch && matchCat && matchCuisine && matchOccasion;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [search, filters]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>REZEPTE</Text>
        <Text style={styles.headerSub}>& Weinempfehlungen</Text>
      </View>

      {/* Search + Filter Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.accent} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rezept suchen..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={openFilter}>
          <Ionicons name="options-outline" size={22} color={colors.accent} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Results count */}
      <Text style={styles.resultCount}>
        {filtered.length} Rezept{filtered.length !== 1 ? 'e' : ''}
      </Text>

      {/* Recipe List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            onPress={() => router.push(`/recipe/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>Keine Rezepte gefunden</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="none"
        onRequestClose={closeFilter}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeFilter} />
        <Animated.View
          style={[styles.filterSheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.filterHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text style={styles.resetText}>Zurücksetzen</Text>
              </TouchableOpacity>
            </View>

            {/* Category */}
            <Text style={styles.filterGroup}>Gang</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <FilterChip
                  key={cat}
                  label={cat}
                  active={pendingFilters.category === cat}
                  onPress={() => setPendingFilters((p) => ({ ...p, category: cat }))}
                />
              ))}
            </View>

            {/* Cuisine */}
            <Text style={styles.filterGroup}>Küche</Text>
            <View style={styles.chipRow}>
              {CUISINES.map((c) => (
                <FilterChip
                  key={c}
                  label={c}
                  active={pendingFilters.cuisine === c}
                  onPress={() => setPendingFilters((p) => ({ ...p, cuisine: c }))}
                />
              ))}
            </View>

            {/* Occasion */}
            <Text style={styles.filterGroup}>Anlass</Text>
            <View style={styles.chipRow}>
              {OCCASIONS.map((occ) => (
                <FilterChip
                  key={occ}
                  label={occ}
                  active={pendingFilters.occasion === occ}
                  onPress={() => setPendingFilters((p) => ({ ...p, occasion: occ }))}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Filter anwenden</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 3,
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 1,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '700',
  },
  resultCount: {
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    height: 220,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 10, 15, 0.55)',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(26, 10, 15, 0.75)',
  },
  cardBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cuisineBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  cuisineText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  // Filter Modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  filterSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  filterHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  filterTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  resetText: {
    color: colors.textMuted,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  filterGroup: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.background,
  },
  applyButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  applyButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
