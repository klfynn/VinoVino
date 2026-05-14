import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import { recognizeWineLabel } from '../services/wineRecognition';
import { ScanResultSheet } from '../components/ScanResultSheet';
import { useApp } from '../../context/AppContext';
import { colors, radii, spacing } from '../../theme';

const SCAN_FRAME_SIZE = 280;
const SCAN_FRAME_HEIGHT = 360;

export default function ScannerScreen({ onClose }) {
  const cameraRef = useRef(null);
  const [permission, setPermission] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const { addToWatchlist, addToCart, watchlist } = useApp();

  const scanLineY = useSharedValue(0);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withSequence(
        withTiming(SCAN_FRAME_HEIGHT - 4, {
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(scanLineY);
  }, [scanLineY]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const analyzeImage = useCallback(async (base64) => {
    setAnalyzing(true);
    try {
      const wine = await recognizeWineLabel(base64);
      setResult(wine);
      setSheetVisible(true);
    } catch (err) {
      Alert.alert('Analyse fehlgeschlagen', 'Bitte versuche es erneut.');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || analyzing) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
        skipProcessing: true,
      });
      analyzeImage(photo?.base64 || '');
    } catch (err) {
      Alert.alert('Foto fehlgeschlagen', 'Bitte versuche es erneut.');
    }
  }, [analyzing, analyzeImage]);

  const handlePickFromGallery = useCallback(async () => {
    if (analyzing) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Galerie-Zugriff', 'Bitte erlaube den Zugriff auf die Mediathek.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!res.canceled && res.assets?.[0]) {
      analyzeImage(res.assets[0].base64 || '');
    }
  }, [analyzing, analyzeImage]);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    setTimeout(() => setResult(null), 300);
  }, []);

  const isWatchlisted = !!result && watchlist.some((w) => w.id === wineKey(result));

  const handleAddToWatchlist = useCallback(
    (wine) => {
      addToWatchlist(toWineRecord(wine));
    },
    [addToWatchlist],
  );

  const handleAddToCart = useCallback(
    (wine) => {
      addToCart(toWineRecord(wine), 1);
      handleSheetClose();
    },
    [addToCart, handleSheetClose],
  );

  if (permission === null) {
    return (
      <SafeAreaView style={styles.permContainer} edges={['top']}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (permission === false) {
    return (
      <SafeAreaView style={styles.permContainer} edges={['top']}>
        <Ionicons name="camera-outline" size={48} color={colors.accent} />
        <Text style={styles.permTitle}>Kamerazugriff benötigt</Text>
        <Text style={styles.permSub}>
          Erlaube den Zugriff auf die Kamera, um Etiketten zu scannen.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={onClose}>
          <Text style={styles.permBtnText}>Zurück</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera ref={cameraRef} style={StyleSheet.absoluteFill} type={CameraType.back} />

      <View style={styles.overlay} pointerEvents="box-none">
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <View style={styles.topInner}>
            <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>ETIKETT SCANNEN</Text>
            <View style={styles.iconBtnPlaceholder} />
          </View>
        </SafeAreaView>

        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Animated.View style={[styles.scanLine, scanLineStyle]} />
          </View>
          <Text style={styles.hint}>Halte das Etikett im Rahmen</Text>
        </View>

        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <View style={styles.bottomInner}>
            <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery}>
              <Ionicons name="images-outline" size={24} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shutterOuter}
              onPress={handleCapture}
              disabled={analyzing}
              activeOpacity={0.85}
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            <View style={styles.galleryBtnPlaceholder} />
          </View>
        </SafeAreaView>
      </View>

      {analyzing && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingTitle}>KI analysiert Etikett...</Text>
            <Text style={styles.loadingSub}>Einen Moment bitte</Text>
          </View>
        </View>
      )}

      <ScanResultSheet
        visible={sheetVisible}
        wine={result}
        onClose={handleSheetClose}
        onAddToWatchlist={handleAddToWatchlist}
        onAddToCart={handleAddToCart}
        watchlisted={isWatchlisted}
      />
    </View>
  );
}

function wineKey(scanned) {
  return `scan-${scanned.producer}-${scanned.name}-${scanned.year}`
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function toWineRecord(scanned) {
  return {
    id: wineKey(scanned),
    name: scanned.name,
    winery: scanned.producer,
    vintage: scanned.year,
    type: mapType(scanned.type),
    region: scanned.region,
    country: scanned.region.split(',').slice(-1)[0]?.trim() || '',
    grape: scanned.grape,
    taste: [],
    description: scanned.description,
    rating: scanned.rating,
    price: scanned.price,
    image: '',
  };
}

function mapType(type) {
  switch (type) {
    case 'Rotwein':
      return 'Rotwein';
    case 'Weißwein':
      return 'Weißwein';
    case 'Rosé':
      return 'Roséwein';
    case 'Champagner':
      return 'Schaumwein';
    case 'Port':
      return 'Süßwein';
    default:
      return 'Rotwein';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: { backgroundColor: 'rgba(26,10,15,0.55)' },
  topInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26,10,15,0.75)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPlaceholder: { width: 40, height: 40 },
  title: {
    color: colors.text,
    fontSize: 14,
    letterSpacing: 3,
    fontWeight: '700',
  },
  frameWrap: { alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_HEIGHT,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  hint: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 13,
    letterSpacing: 1,
    backgroundColor: 'rgba(26,10,15,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  bottomBar: { backgroundColor: 'rgba(26,10,15,0.55)' },
  bottomInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  galleryBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryBtnPlaceholder: { width: 52, height: 52 },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,10,15,0.3)',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 240,
  },
  loadingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  loadingSub: { color: colors.textMuted, fontSize: 13 },
  permContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  permTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  permSub: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  permBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  permBtnText: { color: colors.accent, fontWeight: '700', letterSpacing: 1 },
});
