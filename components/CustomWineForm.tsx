import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TERROIR, WEINART_WERTE } from '../lib/tasting/catalog';
import { validateCustomWineInput } from '../lib/cellar/validate';
import type { CellarResult, CustomWine, CustomWineErrors } from '../lib/cellar/types';
import { colors, radii, spacing } from '../theme';

/** Formularwerte als Texte, so wie sie eingetippt werden. */
export type CustomWineFormState = {
  name: string;
  weingut: string;
  weinart: string | null;
  jahrgang: string;
  herkunft: string;
  region: string;
  rebsorte: string;
  quantity: string;
  preis: string;
  boden: string;
};

export const EMPTY_CUSTOM_WINE_FORM: CustomWineFormState = {
  name: '',
  weingut: '',
  weinart: null,
  jahrgang: '',
  herkunft: '',
  region: '',
  rebsorte: '',
  quantity: '1',
  preis: '',
  boden: 'weiss_nicht',
};

/** Vorbelegung zum Bearbeiten eines eigenen Weins. */
export function formStateFromCustomWine(cw: CustomWine): CustomWineFormState {
  return {
    name: cw.name,
    weingut: cw.weingut ?? '',
    weinart: cw.weinart,
    jahrgang: cw.jahrgang ?? '',
    herkunft: cw.herkunft ?? '',
    region: cw.region ?? '',
    rebsorte: cw.rebsorte ?? '',
    quantity: String(cw.quantity),
    preis: cw.preis != null ? cw.preis.toFixed(2).replace('.', ',') : '',
    boden: cw.boden ?? 'weiss_nicht',
  };
}

const BODEN_ERKLAERUNG =
  'Wenn du den Boden des Weinbergs kennst, kannst du ihn hier eintragen. Beim Verkosten vergleichst du ihn mit deinem Eindruck.';

/**
 * Felder für einen eigenen Wein (Anlegen und Bearbeiten). Prüft die Eingaben vor dem Speichern
 * und zeigt Fehler direkt am Feld. `onSubmit` liefert ein Ergebnis; Speicherfehler erscheinen über dem Knopf.
 */
export function CustomWineFields({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: CustomWineFormState;
  submitLabel: string;
  onSubmit: (values: CustomWineFormState) => Promise<CellarResult<unknown>>;
}) {
  const [form, setForm] = useState<CustomWineFormState>(initial);
  const [errors, setErrors] = useState<CustomWineErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial);
    setErrors({});
    setSaveError(null);
  }, [initial]);

  function set<K extends keyof CustomWineFormState>(key: K, value: CustomWineFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Fehler am Feld verschwindet, sobald es geändert wird.
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit() {
    if (saving) return;
    const check = validateCustomWineInput(form);
    setErrors(check.errors);
    setSaveError(null);
    if (!check.ok) return;
    setSaving(true);
    const result = await onSubmit(form);
    setSaving(false);
    if (!result.ok) setSaveError(result.error);
  }

  const bodenOption = TERROIR.boeden.optionen.find((o) => o.id === form.boden);

  const textField = (
    key: 'name' | 'weingut' | 'jahrgang' | 'herkunft' | 'region' | 'rebsorte' | 'quantity' | 'preis',
    label: string,
    placeholder: string,
    extra?: Partial<React.ComponentProps<typeof TextInput>>,
  ) => (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, errors[key] ? styles.fieldInputError : null]}
        value={form[key]}
        onChangeText={(v) => set(key, v)}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        {...extra}
      />
      {errors[key] ? <Text style={styles.fieldError}>{errors[key]}</Text> : null}
    </>
  );

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      {textField('name', 'Name *', 'z. B. Barolo Riserva', { maxLength: 140 })}
      {textField('weingut', 'Weingut', 'z. B. Tenuta San Lorenzo', { maxLength: 140 })}

      <Text style={styles.fieldLabel}>Weinart</Text>
      <View style={styles.pickerRow}>
        {WEINART_WERTE.map((t) => {
          const active = form.weinart === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.pickerChip, active && styles.pickerChipActive]}
              onPress={() => set('weinart', active ? null : t)}
            >
              <Text style={[styles.pickerChipText, active && styles.pickerChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.weinart ? <Text style={styles.fieldError}>{errors.weinart}</Text> : null}

      {textField('jahrgang', 'Jahrgang', 'z. B. 2019 oder NV', { maxLength: 20, autoCapitalize: 'characters' })}
      {textField('herkunft', 'Herkunft (Land)', 'z. B. Italien', { maxLength: 140 })}
      {textField('region', 'Region', 'z. B. Piemont', { maxLength: 140 })}
      {textField('rebsorte', 'Rebsorte', 'z. B. Nebbiolo', { maxLength: 140 })}
      {textField('quantity', 'Anzahl Flaschen', '1', { keyboardType: 'number-pad', maxLength: 5 })}
      {textField('preis', 'Kaufpreis pro Flasche (optional)', 'z. B. 12,50', { keyboardType: 'decimal-pad', maxLength: 12 })}

      <Text style={styles.fieldLabel}>Boden (optional)</Text>
      <Text style={styles.helpText}>{BODEN_ERKLAERUNG}</Text>
      <View style={styles.pickerRow}>
        {TERROIR.boeden.optionen.map((o) => {
          const active = form.boden === o.id;
          return (
            <TouchableOpacity
              key={o.id}
              style={[styles.pickerChip, active && styles.pickerChipActive]}
              onPress={() => set('boden', o.id)}
            >
              <Text style={[styles.pickerChipText, active && styles.pickerChipTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {bodenOption?.verbunden_mit && form.boden !== 'weiss_nicht' ? (
        <Text style={styles.helpText}>{bodenOption.verbunden_mit}</Text>
      ) : null}
      {errors.boden ? <Text style={styles.fieldError}>{errors.boden}</Text> : null}

      {saveError ? (
        <View style={styles.saveError}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.skip} />
          <Text style={styles.saveErrorText}>{saveError}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.submitBtn, saving && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <>
            <Ionicons name="library" size={18} color={colors.background} />
            <Text style={styles.submitText}>{submitLabel}</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

/** Eigener Wein bearbeiten (Sheet von unten, im Stil des „+“-Dialogs). */
export function EditCustomWineModal({
  wine,
  onClose,
  onSave,
}: {
  wine: CustomWine | null;
  onClose: () => void;
  onSave: (values: CustomWineFormState) => Promise<CellarResult<unknown>>;
}) {
  const [initial, setInitial] = useState<CustomWineFormState>(EMPTY_CUSTOM_WINE_FORM);
  useEffect(() => {
    if (wine) setInitial(formStateFromCustomWine(wine));
  }, [wine]);

  return (
    <Modal visible={!!wine} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Eigenen Wein bearbeiten</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <CustomWineFields initial={initial} submitLabel="Änderungen speichern" onSubmit={onSave} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.lg, gap: 4 },
  fieldLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: 14,
  },
  fieldInputError: { borderColor: colors.skip },
  fieldError: { color: colors.skip, fontSize: 12, marginTop: 2 },
  helpText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 6 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pickerChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pickerChipActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  pickerChipText: { color: colors.textMuted, fontSize: 13 },
  pickerChipTextActive: { color: colors.background, fontWeight: '700' },
  saveError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.skip,
  },
  saveErrorText: { color: colors.skip, fontSize: 13, flex: 1 },
  submitBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 50,
  },
  submitText: { color: colors.background, fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
  backdrop: { flex: 1, backgroundColor: 'rgba(26,10,15,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.accent, fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
});
