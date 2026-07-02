import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useCellar } from '../context/CellarContext';
import { useAuth, Address } from '../context/AuthContext';
import { colors, radii, spacing } from '../theme';

type Step = 1 | 2 | 3;
type PaymentMethod = 'card' | 'paypal' | 'applepay';

interface CardInfo {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function generateOrderNumber(): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `VV-2026-${suffix}`;
}

// Step indicator
function StepBar({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: 'Adresse' },
    { n: 2, label: 'Zahlung' },
    { n: 3, label: 'Bestätigung' },
  ];
  return (
    <View style={sb.row}>
      {steps.map((s, i) => {
        const active = step >= s.n;
        const current = step === s.n;
        return (
          <React.Fragment key={s.n}>
            <View style={sb.item}>
              <View style={[sb.circle, active ? sb.circleActive : sb.circleInactive]}>
                <Text style={[sb.num, active ? sb.numActive : sb.numInactive]}>
                  {s.n}
                </Text>
              </View>
              <Text style={[sb.label, current ? sb.labelActive : sb.labelInactive]}>
                {s.label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[sb.line, step > s.n ? sb.lineActive : sb.lineInactive]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const sb = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  item: { alignItems: 'center' },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  circleActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  circleInactive: { borderColor: colors.border, backgroundColor: 'transparent' },
  num: { fontSize: 14, fontWeight: '700' },
  numActive: { color: colors.background },
  numInactive: { color: colors.border },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  labelActive: { color: colors.accent },
  labelInactive: { color: colors.border },
  line: { flex: 1, height: 2, marginBottom: 16 },
  lineActive: { backgroundColor: colors.accent },
  lineInactive: { backgroundColor: colors.border },
});

// Input with focus highlight
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  maxLength?: number;
  secureTextEntry?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, focused && f.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: 15,
  },
  inputFocused: { borderColor: colors.accent },
});

// Step 1: Address
function AddressStep({
  address,
  setAddress,
  saveDefault,
  setSaveDefault,
  onNext,
}: {
  address: Address;
  setAddress: React.Dispatch<React.SetStateAction<Address>>;
  saveDefault: boolean;
  setSaveDefault: (v: boolean) => void;
  onNext: () => void;
}) {
  const canProceed =
    address.street.trim() &&
    address.zip.trim() &&
    address.city.trim() &&
    address.country.trim();

  return (
    <ScrollView contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepTitle}>Lieferadresse</Text>
      <Field
        label="Straße + Hausnummer"
        value={address.street}
        onChangeText={(v) => setAddress((a) => ({ ...a, street: v }))}
        placeholder="Musterstraße 12"
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Field
            label="PLZ"
            value={address.zip}
            onChangeText={(v) => setAddress((a) => ({ ...a, zip: v }))}
            placeholder="12345"
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Field
            label="Stadt"
            value={address.city}
            onChangeText={(v) => setAddress((a) => ({ ...a, city: v }))}
            placeholder="Berlin"
          />
        </View>
      </View>
      <Field
        label="Land"
        value={address.country}
        onChangeText={(v) => setAddress((a) => ({ ...a, country: v }))}
        placeholder="Deutschland"
      />

      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => setSaveDefault(!saveDefault)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, saveDefault && styles.checkboxActive]}>
          {saveDefault && <Ionicons name="checkmark" size={14} color={colors.background} />}
        </View>
        <Text style={styles.checkLabel}>Als Standardadresse speichern</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, !canProceed && styles.btnDisabled]}
        onPress={onNext}
        disabled={!canProceed}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Weiter</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.background} />
      </TouchableOpacity>
    </ScrollView>
  );
}

// Step 2: Payment
function PaymentStep({
  method,
  setMethod,
  card,
  setCard,
  onNext,
}: {
  method: PaymentMethod | null;
  setMethod: (m: PaymentMethod) => void;
  card: CardInfo;
  setCard: React.Dispatch<React.SetStateAction<CardInfo>>;
  onNext: () => void;
}) {
  const canProceed =
    method === 'paypal' ||
    method === 'applepay' ||
    (method === 'card' &&
      card.holder.trim() &&
      card.number.replace(/\s/g, '').length === 16 &&
      card.expiry.length === 5 &&
      card.cvv.length >= 3);

  const optionStyle = (m: PaymentMethod) => [
    styles.payOption,
    method === m && styles.payOptionActive,
  ];

  return (
    <ScrollView contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepTitle}>Zahlungsmethode</Text>

      {/* Card */}
      <TouchableOpacity style={optionStyle('card')} onPress={() => setMethod('card')} activeOpacity={0.8}>
        <View style={styles.payOptionHeader}>
          <View style={styles.radioOuter}>
            {method === 'card' && <View style={styles.radioInner} />}
          </View>
          <Text style={styles.payOptionTitle}>Kreditkarte</Text>
          <Text style={styles.cardIcon}>💳</Text>
        </View>
        {method === 'card' && (
          <View style={styles.cardFields}>
            <Field
              label="Karteninhaber"
              value={card.holder}
              onChangeText={(v) => setCard((c) => ({ ...c, holder: v }))}
              placeholder="Max Mustermann"
            />
            <Field
              label="Kartennummer"
              value={card.number}
              onChangeText={(v) => setCard((c) => ({ ...c, number: formatCardNumber(v) }))}
              placeholder="XXXX XXXX XXXX XXXX"
              keyboardType="numeric"
              maxLength={19}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Ablaufdatum"
                  value={card.expiry}
                  onChangeText={(v) => setCard((c) => ({ ...c, expiry: formatExpiry(v) }))}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="CVV"
                  value={card.cvv}
                  onChangeText={(v) => setCard((c) => ({ ...c, cvv: v.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="123"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* PayPal */}
      <TouchableOpacity style={optionStyle('paypal')} onPress={() => setMethod('paypal')} activeOpacity={0.8}>
        <View style={styles.payOptionHeader}>
          <View style={styles.radioOuter}>
            {method === 'paypal' && <View style={styles.radioInner} />}
          </View>
          <Text style={styles.payOptionTitle}>PayPal</Text>
          <Text style={styles.paypalLogo}>Pay<Text style={{ color: colors.accent }}>Pal</Text></Text>
        </View>
        {method === 'paypal' && (
          <Text style={styles.payHint}>Du wirst nach dem Bestätigen zu PayPal weitergeleitet.</Text>
        )}
      </TouchableOpacity>

      {/* Apple Pay */}
      <TouchableOpacity style={optionStyle('applepay')} onPress={() => setMethod('applepay')} activeOpacity={0.8}>
        <View style={styles.payOptionHeader}>
          <View style={styles.radioOuter}>
            {method === 'applepay' && <View style={styles.radioInner} />}
          </View>
          <Text style={styles.payOptionTitle}>Apple Pay</Text>
          <Text style={styles.applePayIcon}> Pay</Text>
        </View>
        {method === 'applepay' && (
          <Text style={styles.payHint}>Zahlung per Face ID / Touch ID bestätigen.</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, !canProceed && styles.btnDisabled]}
        onPress={onNext}
        disabled={!canProceed}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Weiter</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.background} />
      </TouchableOpacity>
    </ScrollView>
  );
}

// Step 3: Confirmation
function ConfirmStep({
  address,
  method,
  card,
  onBuy,
}: {
  address: Address;
  method: PaymentMethod | null;
  card: CardInfo;
  onBuy: () => void;
}) {
  const { cart, cartTotal } = useApp();
  const shipping = 0;

  const paymentLabel = () => {
    if (method === 'card') {
      const last4 = card.number.replace(/\s/g, '').slice(-4) || '????';
      return `Kreditkarte ····${last4}`;
    }
    if (method === 'paypal') return 'PayPal';
    return 'Apple Pay';
  };

  const addrLine = `${address.street}, ${address.zip} ${address.city}, ${address.country}`;

  return (
    <ScrollView contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>Bestellübersicht</Text>

      {/* Wine list */}
      <View style={styles.summaryCard}>
        {cart.map((item) => (
          <View key={item.wine.id} style={styles.summaryRow}>
            <Text style={styles.summaryWineName} numberOfLines={1}>
              {item.wine.name}
            </Text>
            <Text style={styles.summaryQty}>×{item.quantity}</Text>
            <Text style={styles.summaryPrice}>
              € {(item.wine.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Address */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>LIEFERADRESSE</Text>
        <Text style={styles.infoValue} numberOfLines={2}>{addrLine}</Text>
      </View>

      {/* Payment */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>ZAHLUNGSMETHODE</Text>
        <Text style={styles.infoValue}>{paymentLabel()}</Text>
      </View>

      {/* Totals */}
      <View style={styles.totalsCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Zwischensumme</Text>
          <Text style={styles.totalVal}>€ {cartTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Versandkosten</Text>
          <Text style={styles.totalVal}>Wird vom Händler berechnet</Text>
        </View>
        <View style={[styles.totalRow, styles.totalRowFinal]}>
          <Text style={styles.totalLabelBig}>Gesamtsumme</Text>
          <Text style={styles.totalValBig}>€ {(cartTotal + shipping).toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.buyBtn} onPress={onBuy} activeOpacity={0.85}>
        <Text style={styles.buyBtnText}>Jetzt kaufen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Success screen
function SuccessScreen({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.successContainer}>
      <Animated.View
        style={[styles.successCircle, { transform: [{ scale: scaleAnim }] }]}
      >
        <Ionicons name="checkmark" size={52} color={colors.background} />
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text style={styles.successTitle}>Bestellung aufgegeben!</Text>
        <Text style={styles.successSub}>Deine Weine sind auf dem Weg zu dir.</Text>
        <View style={styles.orderNumBadge}>
          <Text style={styles.orderNumLabel}>Bestellnummer</Text>
          <Text style={styles.orderNum}>{orderNumber}</Text>
        </View>

        <TouchableOpacity
          style={styles.discoverBtn}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}
        >
          <Text style={styles.discoverBtnText}>Zurück zum Entdecken</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// Main checkout screen
export default function CheckoutScreen() {
  const router = useRouter();
  const { cart, cartTotal, removeFromCart } = useApp();
  const { addToCellar } = useCellar();
  const { user, updateAddress } = useAuth();

  const [step, setStep] = useState<Step>(1);

  const [address, setAddress] = useState<Address>({
    street: user?.address?.street ?? '',
    zip: user?.address?.zip ?? '',
    city: user?.address?.city ?? '',
    country: user?.address?.country ?? 'Deutschland',
  });
  const [saveDefault, setSaveDefault] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [card, setCard] = useState<CardInfo>({ holder: '', number: '', expiry: '', cvv: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const handleNext1 = useCallback(async () => {
    if (saveDefault) {
      await updateAddress(address);
    }
    setStep(2);
  }, [address, saveDefault, updateAddress]);

  const handleNext2 = useCallback(() => {
    setStep(3);
  }, []);

  const handleBuy = useCallback(async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    for (const item of cart) {
      await addToCellar(item.wine, item.quantity, 'purchase');
    }
    for (const item of cart) {
      removeFromCart(item.wine.id);
    }
    setOrderNumber(generateOrderNumber());
    setIsLoading(false);
    setIsSuccess(true);
  }, [cart, addToCellar, removeFromCart]);

  const handleBack = useCallback(() => {
    if (step === 1) {
      router.back();
    } else {
      setStep((s) => (s - 1) as Step);
    }
  }, [step, router]);

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <SuccessScreen orderNumber={orderNumber} />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Bestellung wird aufgegeben...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kasse</Text>
          <View style={{ width: 40 }} />
        </View>

        <StepBar step={step} />

        {step === 1 && (
          <AddressStep
            address={address}
            setAddress={setAddress}
            saveDefault={saveDefault}
            setSaveDefault={setSaveDefault}
            onNext={handleNext1}
          />
        )}
        {step === 2 && (
          <PaymentStep
            method={paymentMethod}
            setMethod={setPaymentMethod}
            card={card}
            setCard={setCard}
            onNext={handleNext2}
          />
        )}
        {step === 3 && (
          <ConfirmStep
            address={address}
            method={paymentMethod}
            card={card}
            onBuy={handleBuy}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  stepContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkLabel: { color: colors.textMuted, fontSize: 14 },

  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  btnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },

  // Payment options
  payOption: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  payOptionActive: { borderColor: colors.accent },
  payOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  payOptionTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  cardIcon: { fontSize: 20 },
  paypalLogo: { color: '#003087', fontWeight: '700', fontSize: 16 },
  applePayIcon: { color: colors.text, fontWeight: '700', fontSize: 16 },
  cardFields: { marginTop: spacing.md },
  payHint: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },

  // Summary (step 3)
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  summaryWineName: { flex: 1, color: colors.text, fontSize: 14 },
  summaryQty: { color: colors.textMuted, fontSize: 13, marginHorizontal: spacing.sm },
  summaryPrice: { color: colors.accent, fontSize: 14, fontWeight: '700' },

  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: { color: colors.text, fontSize: 14 },

  totalsCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalRowFinal: {
    borderBottomWidth: 0,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  totalLabel: { color: colors.textMuted, fontSize: 13 },
  totalVal: { color: colors.textMuted, fontSize: 13, flexShrink: 1, textAlign: 'right', marginLeft: spacing.sm },
  totalLabelBig: { color: colors.text, fontSize: 16, fontWeight: '700' },
  totalValBig: { color: colors.accent, fontSize: 18, fontWeight: '700' },

  buyBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: spacing.sm,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successSub: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  orderNumBadge: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  orderNumLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  orderNum: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
  },
  discoverBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  discoverBtnText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
