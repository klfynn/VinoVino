// Wiederverwendbare Darstellung eines Weinbilds: helle, neutrale Fläche, die Flasche mittig mit
// Abstand rundherum (resizeMode „contain“). Ohne Bild, während des Ladens und bei einem Fehler
// zeigt dieselbe Fläche eine Flaschen-Silhouette, getönt nach Weinart.
// Animation nur mit `Animated` aus React Native.
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';
import {
  normalizeWineImageUri,
  silhouetteIconSize,
  wineImageInsetPercent,
  wineImageLabel,
  wineImagePreset,
  wineImageTint,
  type WineImageSize,
} from '../lib/wineImage';

type Status = 'laedt' | 'geladen' | 'fehler';

interface Props {
  /** Bildadresse (`wines.bild_url`). Nur `https://` wird geladen, alles andere zeigt den Platzhalter. */
  uri?: string | null;
  /** Weinart für die Tönung des Platzhalters (Text aus der Datenbank oder `Wine.type`). */
  weinart?: unknown;
  /** Name des Weins für die Barrierefreiheit („Flasche <Name>“). */
  name?: string;
  /** Voreinstellung je Ort (Seitenverhältnis, Radius, Füllgrad, freier Bereich unten). */
  size?: WineImageSize;
  /**
   * true: die Fläche übernimmt die über `style` vorgegebene Größe ohne eigenes
   * Seitenverhältnis, ohne Radius und ohne Rand, weil die umgebende Karte zuschneidet.
   */
  fill?: boolean;
  /** Überschreibt den freien Bereich unten aus der Voreinstellung (Pixel). */
  freiUnten?: number;
  style?: StyleProp<ViewStyle>;
}

export function WineImage({ uri, weinart, name, size = 'liste', fill = false, freiUnten, style }: Props) {
  const preset = wineImagePreset(size);
  const adresse = normalizeWineImageUri(uri);
  const [status, setStatus] = useState<Status>('laedt');
  const [bereich, setBereich] = useState<{ w: number; h: number } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  // Neue Adresse: wieder mit dem Platzhalter beginnen.
  useEffect(() => {
    setStatus('laedt');
    opacity.setValue(0);
  }, [adresse, opacity]);

  const onLoad = () => {
    setStatus('geladen');
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };
  const onError = () => {
    setStatus('fehler');
    opacity.setValue(0);
  };
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBereich((alt) => (alt && alt.w === width && alt.h === height ? alt : { w: width, h: height }));
  };

  const zeigtBild = adresse !== null && status !== 'fehler';
  const zeigtPlatzhalter = adresse === null || status !== 'geladen';
  const inset = wineImageInsetPercent(preset.fuellgrad);
  const iconSize = bereich ? silhouetteIconSize(bereich.w, bereich.h) : 0;

  return (
    <View
      style={[
        styles.surface,
        fill
          ? styles.fill
          : { aspectRatio: preset.aspectRatio, borderRadius: preset.radius, ...styles.rand },
        style,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={wineImageLabel(name, adresse !== null && status === 'geladen')}
    >
      {/* Sichtbereich: oben bis zum freien Bereich unten (Verlauf, Texte). */}
      <View style={[StyleSheet.absoluteFill, { bottom: Math.max(0, freiUnten ?? preset.freiUnten) }]}>
        <View
          style={[styles.inhalt, { top: inset, bottom: inset, left: inset, right: inset }]}
          onLayout={onLayout}
          pointerEvents="none"
        >
          {zeigtPlatzhalter && iconSize > 0 && (
            <MaterialCommunityIcons name="bottle-wine" size={iconSize} color={wineImageTint(weinart)} />
          )}
          {zeigtBild && (
            <Animated.Image
              source={{ uri: adresse }}
              style={[StyleSheet.absoluteFill, { opacity }]}
              resizeMode="contain"
              onLoad={onLoad}
              onError={onError}
              accessibilityIgnoresInvertColors
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.imageSurface,
    overflow: 'hidden',
  },
  // Beim Füllen kommt die Größe vom Aufrufer (`style`), zum Beispiel `absoluteFill` oder eine feste Breite.
  fill: {},
  rand: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.imageSurfaceBorder,
  },
  inhalt: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
