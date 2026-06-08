import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radii } from '../../theme';
import { recipes } from '../data/recipes';
import { wines } from '../../data/wines';
import { useApp } from '../../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 320;

function WineRecommendCard({ wineId }: { wineId: string }) {
  const wine = wines.find((w) => w.id === wineId);
  const { addToCart } = useApp();

  if (!wine) return null;

  const handleAddToCart = () => {
    addToCart(wine, 1);
    Alert.alert('Hinzugefügt', `${wine.name} wurde in den Warenkorb gelegt.`);
  };

  return (
    <View style={styles.wineCard}>
      <Image source={{ uri: wine.image }} style={styles.wineCardImage} resizeMode="cover" />
      <View style={styles.wineCardOverlay} />
      <View style={styles.wineCardContent}>
        <Text style={styles.wineCardName} numberOfLines={2}>{wine.name}</Text>
        <Text style={styles.wineCardWinery} numberOfLines={1}>{wine.winery}</Text>
        <View style={styles.wineCardMeta}>
          <Text style={styles.wineCardVintage}>{wine.vintage}</Text>
          <Text style={styles.wineCardPrice}>€{wine.price.toFixed(2)}</Text>
        </View>
        <View style={styles.wineCardRating}>
          <Ionicons name="star" size={12} color={colors.accent} />
          <Text style={styles.ratingText}>{wine.rating}</Text>
        </View>
        <TouchableOpacity style={styles.cartButton} onPress={handleAddToCart}>
          <Ionicons name="cart-outline" size={14} color={colors.background} />
          <Text style={styles.cartButtonText}>In den Warenkorb</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const recipe = useMemo(() => recipes.find((r) => r.id === id), [id]);

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Rezept nicht gefunden.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Zurück</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Image */}
        <View style={styles.hero}>
          <Image source={{ uri: recipe.image }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroGradient} />
          {/* Back Button */}
          <SafeAreaView style={styles.backButtonWrapper} edges={['top']}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          </SafeAreaView>
          {/* Title Overlay */}
          <View style={styles.heroTitleArea}>
            <View style={styles.heroBadgeRow}>
              <View
                style={[
                  styles.heroBadge,
                  {
                    backgroundColor:
                      recipe.category === 'Vorspeise'
                        ? '#4a7c59'
                        : recipe.category === 'Hauptgang'
                        ? '#7c2535'
                        : '#8a6020',
                  },
                ]}
              >
                <Text style={styles.heroBadgeText}>{recipe.category}</Text>
              </View>
              <View style={styles.heroCuisineBadge}>
                <Text style={styles.heroCuisineText}>{recipe.cuisine}</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>{recipe.name}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Description */}
          <Text style={styles.description}>{recipe.description}</Text>

          {/* Occasions */}
          <View style={styles.occasionRow}>
            {recipe.occasion.map((occ) => (
              <View key={occ} style={styles.occasionTag}>
                <Text style={styles.occasionText}>{occ}</Text>
              </View>
            ))}
          </View>

          {/* Wine Pairings (new format) */}
          {recipe.pairings && recipe.pairings.length > 0 && (
            <View>
              <Text style={styles.wineSectionTitle}>🍷 Weinempfehlungen</Text>
              {recipe.pairings.map((pairing, idx) => (
                <View key={idx} style={[styles.wineSection, { marginBottom: spacing.md }]}>
                  <View style={styles.wineTagRow}>
                    <View style={styles.wineTag}>
                      <Ionicons name="wine-outline" size={13} color={colors.accent} />
                      <Text style={styles.wineTagText}>{pairing.type}</Text>
                    </View>
                    <View style={styles.wineTag}>
                      <Ionicons name="leaf-outline" size={13} color={colors.accent} />
                      <Text style={styles.wineTagText}>{pairing.grapes.join(', ')}</Text>
                    </View>
                    <View style={styles.wineTag}>
                      <Ionicons name="water-outline" size={13} color={colors.accent} />
                      <Text style={styles.wineTagText}>{pairing.taste}</Text>
                    </View>
                  </View>
                  <Text style={styles.wineDescription}>{pairing.description}</Text>
                  {pairing.recommendedWineIds.length > 0 && (
                    <FlatList
                      data={pairing.recommendedWineIds}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => <WineRecommendCard wineId={item} />}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.wineCardList}
                    />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Wine Recommendation (legacy format) */}
          {recipe.wineRecommendation && (
            <View style={styles.wineSection}>
              <View style={styles.wineSectionHeader}>
                <Text style={styles.wineSectionTitle}>🍷 Passender Wein</Text>
              </View>
              <View style={styles.wineTagRow}>
                <View style={styles.wineTag}>
                  <Ionicons name="wine-outline" size={13} color={colors.accent} />
                  <Text style={styles.wineTagText}>{recipe.wineRecommendation.type}</Text>
                </View>
                <View style={styles.wineTag}>
                  <Ionicons name="leaf-outline" size={13} color={colors.accent} />
                  <Text style={styles.wineTagText}>{recipe.wineRecommendation.grape}</Text>
                </View>
                <View style={styles.wineTag}>
                  <Ionicons name="water-outline" size={13} color={colors.accent} />
                  <Text style={styles.wineTagText}>{recipe.wineRecommendation.taste}</Text>
                </View>
              </View>
              <Text style={styles.wineDescription}>{recipe.wineRecommendation.description}</Text>
              {recipe.wineRecommendation.recommendedWines.length > 0 && (
                <FlatList
                  data={recipe.wineRecommendation.recommendedWines}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => <WineRecommendCard wineId={item} />}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.wineCardList}
                />
              )}
            </View>
          )}

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zutaten</Text>
            {recipe.ingredients.map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <View style={styles.ingredientBullet} />
                <Text style={styles.ingredientText}>{ing}</Text>
              </View>
            ))}
          </View>

          {/* Steps */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zubereitung</Text>
            {recipe.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  hero: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: HEADER_HEIGHT,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 10, 15, 0.45)',
  },
  backButtonWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    marginLeft: spacing.md,
    marginTop: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 10, 15, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTitleArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(26, 10, 15, 0.75)',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  heroBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroCuisineBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  heroCuisineText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  body: {
    padding: spacing.lg,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  occasionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  occasionTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  occasionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  // Wine Section
  wineSection: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  wineSectionHeader: {
    marginBottom: spacing.md,
  },
  wineSectionTitle: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  wineTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  wineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  wineTagText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  wineDescription: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  wineCardList: {
    paddingBottom: spacing.xs,
  },
  // Wine Recommend Card
  wineCard: {
    width: 180,
    height: 240,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  wineCardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  wineCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 10, 15, 0.65)',
  },
  wineCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    backgroundColor: 'rgba(26, 10, 15, 0.8)',
  },
  wineCardName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  wineCardWinery: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  wineCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  wineCardVintage: {
    color: colors.textMuted,
    fontSize: 11,
  },
  wineCardPrice: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  wineCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: spacing.sm,
  },
  ratingText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  cartButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  cartButtonText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '700',
  },
  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 7,
    flexShrink: 0,
  },
  ingredientText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '800',
  },
  stepText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
    paddingTop: 3,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  notFoundText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  backLink: {
    color: colors.accent,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
