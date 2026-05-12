import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Wine } from '../types';
import { colors, radii, spacing } from '../theme';

interface Props {
  visible: boolean;
  wine: Wine | null;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}

const PRESETS = [3, 6, 12];

export function QuantityModal({ visible, wine, onConfirm, onClose }: Props) {
  const [qty, setQty] = useState(6);
  useEffect(() => { if (visible) setQty(6); }, [visible]);
  if (!wine) return null;
  const total = (wine.price * qty).toFixed(2);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>MENGE WÄHLEN</Text>
          <Text style={styles.title} numberOfLines={2}>{wine.name}</Text>
          <Text style={styles.winery}>{wine.winery} · {wine.vintage}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
              <Ionicons name="remove" size={28} color={colors.accent} />
            </TouchableOpacity>
            <View style={styles.qtyDisplay}>
              <Text style={styles.qtyNumber}>{qty}</Text>
              <Text style={styles.qtyLabel}>Flaschen</Text>
            </View>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setQty((q) => q + 1)}>
              <Ionicons name="add" size={28} color={colors.accent} />
            </TouchableOpacity>
          </View>
          <View style={styles.presetRow}>
            {PRESETS.map((p) => (
              <TouchableOpacity key={p} style={[styles.preset, qty === p && styles.presetActive]} onPress={() => setQty(p)}>
                <Text style={[styles.presetText, qty === p && styles.presetTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gesamt</Text>
            <Text style={styles.totalValue}>€ {total}</Text>
          </View>
          <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(qty)}>
            <Ionicons name="cart" size={20} color={colors.background} />
            <Text style={styles.confirmText}>In den Warenkorb</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Abbrechen</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl + spacing.md },
  handle: { width: 44, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  eyebrow: { color: colors.accent, letterSpacing: 3, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: spacing.sm },
  winery: { color: colors.textMuted, fontSize: 14, textAlign: 'center', fontStyle: 'italic', marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.md },
  stepBtn: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardElevated },
  qtyDisplay: { alignItems: 'center' },
  qtyNumber: { color: colors.accent, fontSize: 54, fontWeight: '300', lineHeight: 60 },
  qtyLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 2 },
  presetRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  preset: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, minWidth: 56, alignItems: 'center' },
  presetActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  presetText: { color: colors.text, fontWeight: '600' },
  presetTextActive: { color: colors.background },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { color: colors.textMuted, fontSize: 14, letterSpacing: 1 },
  totalValue: { color: colors.text, fontSize: 22, fontWeight: '700' },
  confirmBtn: { backgroundColor: colors.accent, paddingVertical: spacing.md, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  confirmText: { color: colors.background, fontWeight: '700', fontSize: 16, letterSpacing: 1 },
  cancelBtn: { paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  cancelText: { color: colors.textMuted, fontSize: 14 },
});
