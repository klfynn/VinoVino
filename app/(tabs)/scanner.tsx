import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WineDetailModal } from '../../components/WineDetailModal';
import { useApp } from '../../context/AppContext';
import { recognizeWineLabel } from '../../services/wineRecognition';
import { colors, radii, spacing } from '../../theme';
import type { Wine } from '../../types';

const { width: SW, height: SH } = Dimensions.get('window');
const FRAME_SIZE = Math.round(SW * 0.75);
const FRAME_LEFT = (SW - FRAME_SIZE) / 2;
const FRAME_TOP = Math.round(SH * 0.2);
const CORNER_LEN = 28;
const CORNER_W = 3;

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [scannedWine, setScannedWine] = useState<Wine | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { watchlist, addToWatchlist, removeFromWatchlist, addToCart } = useApp();

  const scanY = useSharedValue(0);
  useEffect(() => {
    scanY.value = withRepeat(
      withTiming(FRAME_SIZE - 2, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [scanY]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
  }));

  const watchlisted =
    scannedWine != null && watchlist.some((w) => w.id === scannedWine.id);

  async function handleCapture() {
    if (!cameraRef.current || analyzing) return;
    setAnalyzing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      const wine = await recognizeWineLabel(photo?.base64 ?? '');
      setScannedWine(wine);
      setModalVisible(true);
    } catch {
      // silent
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGallery() {
    if (analyzing) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setAnalyzing(true);
    try {
      const asset = result.assets[0];
      let b64 = asset.base64 ?? '';
      if (!b64 && asset.uri) {
        b64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      const wine = await recognizeWineLabel(b64);
      setScannedWine(wine);
      setModalVisible(true);
    } catch {
      // silent
    } finally {
      setAnalyzing(false);
    }
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.permBox}>
          <Ionicons name="camera-outline" size={72} color={colors.accent} />
          <Text style={styles.permTitle}>Kamerazugriff benötigt</Text>
          <Text style={styles.permText}>
            VinoVino benötigt Kamerazugriff zum Scannen von Weinetiketten.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Zugriff erlauben</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Semi-transparent overlays surrounding the scan frame */}
      <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: FRAME_TOP }]} />
      <View
        style={[
          styles.overlay,
          { top: FRAME_TOP, left: 0, width: FRAME_LEFT, height: FRAME_SIZE },
        ]}
      />
      <View
        style={[
          styles.overlay,
          { top: FRAME_TOP, right: 0, width: FRAME_LEFT, height: FRAME_SIZE },
        ]}
      />
      <View
        style={[
          styles.overlay,
          { top: FRAME_TOP + FRAME_SIZE, left: 0, right: 0, bottom: 0 },
        ]}
      />

      {/* Scan frame with golden corner brackets and animated line */}
      <View
        style={[
          styles.frame,
          { top: FRAME_TOP, left: FRAME_LEFT, width: FRAME_SIZE, height: FRAME_SIZE },
        ]}
      >
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
        <Animated.View style={[styles.scanLine, scanLineStyle]} />
      </View>

      {/* Header */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <Text style={styles.headerTitle}>ETIKETT SCANNEN</Text>
        <Text style={styles.headerSub}>Halte das Weinetikett in den Rahmen</Text>
      </SafeAreaView>

      {/* Bottom controls */}
      <SafeAreaView style={styles.controls} edges={['bottom']}>
        <TouchableOpacity style={styles.galleryBtn} onPress={handleGallery} disabled={analyzing}>
          <Ionicons name="images-outline" size={28} color={colors.text} />
          <Text style={styles.galleryLabel}>Galerie</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureBtn, analyzing && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={analyzing}
          activeOpacity={0.8}
        >
          <View style={styles.captureBtnInner} />
        </TouchableOpacity>

        <View style={{ width: 72 }} />
      </SafeAreaView>

      {/* Loading overlay */}
      {analyzing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>KI analysiert Etikett…</Text>
          </View>
        </View>
      )}

      <WineDetailModal
        visible={modalVisible}
        wine={scannedWine}
        onClose={() => setModalVisible(false)}
        onAddToWatchlist={(wine) => {
          if (watchlisted) removeFromWatchlist(wine.id);
          else addToWatchlist(wine);
        }}
        onAddToCart={(wine) => {
          addToCart(wine, 1);
          setModalVisible(false);
        }}
        watchlisted={watchlisted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(26, 10, 15, 0.82)',
  },
  frame: {
    position: 'absolute',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: CORNER_LEN,
    height: CORNER_LEN,
    borderColor: colors.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 8,
  },
  headerTitle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: 'rgba(26, 10, 15, 0.82)',
  },
  galleryBtn: {
    alignItems: 'center',
    width: 72,
  },
  galleryLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.8,
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnDisabled: {
    opacity: 0.4,
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 10, 15, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 220,
  },
  loadingText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  permBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  permBtnText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 1,
  },
});
