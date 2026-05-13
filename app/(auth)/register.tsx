import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  password: string;
  passwordConfirm: string;
}

type FormErrors = Partial<Record<keyof FormState | 'terms', string>>;

const initialForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  street: '',
  zip: '',
  city: '',
  country: '',
  password: '',
  passwordConfirm: '',
};

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

function evaluatePassword(pw: string): PasswordStrength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map: PasswordStrength[] = [
    { score: 0, label: 'Zu schwach', color: colors.skip },
    { score: 1, label: 'Schwach', color: '#c0607a' },
    { score: 2, label: 'Mittel', color: '#c9a96e' },
    { score: 3, label: 'Stark', color: '#a8c97e' },
    { score: 4, label: 'Sehr stark', color: colors.like },
  ];
  return map[score] as PasswordStrength;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => evaluatePassword(form.password), [form.password]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.firstName.trim()) next.firstName = 'Vorname erforderlich';
    if (!form.lastName.trim()) next.lastName = 'Nachname erforderlich';
    if (!form.email.trim()) next.email = 'E-Mail erforderlich';
    else if (!EMAIL_REGEX.test(form.email.trim())) next.email = 'Ungültige E-Mail-Adresse';
    if (!form.street.trim()) next.street = 'Straße erforderlich';
    if (!form.zip.trim()) next.zip = 'PLZ erforderlich';
    if (!form.city.trim()) next.city = 'Stadt erforderlich';
    if (!form.country.trim()) next.country = 'Land erforderlich';
    if (!form.password) next.password = 'Passwort erforderlich';
    else if (strength.score < 2) next.password = 'Passwort zu schwach';
    if (form.password !== form.passwordConfirm) next.passwordConfirm = 'Passwörter stimmen nicht überein';
    if (!acceptedTerms) next.terms = 'Bitte die AGB akzeptieren';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        address: {
          street: form.street.trim(),
          zip: form.zip.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
        },
      });
    } catch (e) {
      Alert.alert('Registrierung fehlgeschlagen', 'Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>VinoVino</Text>
            <Text style={styles.tagline}>Ein Konto erstellen</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>VORNAME</Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  placeholder="Anna"
                  placeholderTextColor={colors.textMuted}
                  value={form.firstName}
                  onChangeText={(v) => update('firstName', v)}
                  autoCapitalize="words"
                />
                {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>NACHNAME</Text>
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  placeholder="Müller"
                  placeholderTextColor={colors.textMuted}
                  value={form.lastName}
                  onChangeText={(v) => update('lastName', v)}
                  autoCapitalize="words"
                />
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>
            </View>

            <Text style={[styles.label, styles.labelSpaced]}>E-MAIL</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="name@beispiel.de"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={form.email}
              onChangeText={(v) => update('email', v)}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={[styles.label, styles.labelSpaced]}>STRASSE & HAUSNUMMER</Text>
            <TextInput
              style={[styles.input, errors.street && styles.inputError]}
              placeholder="Weinstraße 12"
              placeholderTextColor={colors.textMuted}
              value={form.street}
              onChangeText={(v) => update('street', v)}
            />
            {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}

            <View style={[styles.row, { marginTop: spacing.md }]}>
              <View style={[styles.rowItem, { flex: 0.4 }]}>
                <Text style={styles.label}>PLZ</Text>
                <TextInput
                  style={[styles.input, errors.zip && styles.inputError]}
                  placeholder="10115"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  value={form.zip}
                  onChangeText={(v) => update('zip', v)}
                />
                {errors.zip && <Text style={styles.errorText}>{errors.zip}</Text>}
              </View>
              <View style={[styles.rowItem, { flex: 0.6 }]}>
                <Text style={styles.label}>STADT</Text>
                <TextInput
                  style={[styles.input, errors.city && styles.inputError]}
                  placeholder="Berlin"
                  placeholderTextColor={colors.textMuted}
                  value={form.city}
                  onChangeText={(v) => update('city', v)}
                  autoCapitalize="words"
                />
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>
            </View>

            <Text style={[styles.label, styles.labelSpaced]}>LAND</Text>
            <TextInput
              style={[styles.input, errors.country && styles.inputError]}
              placeholder="Deutschland"
              placeholderTextColor={colors.textMuted}
              value={form.country}
              onChangeText={(v) => update('country', v)}
              autoCapitalize="words"
            />
            {errors.country && <Text style={styles.errorText}>{errors.country}</Text>}

            <Text style={[styles.label, styles.labelSpaced]}>PASSWORT</Text>
            <View style={[styles.passwordRow, errors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(v) => update('password', v)}
              />
              <Pressable
                hitSlop={10}
                onPress={() => setShowPassword((s) => !s)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
            {form.password.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBars}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            i < strength.score ? strength.color : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <Text style={[styles.label, styles.labelSpaced]}>PASSWORT BESTÄTIGEN</Text>
            <View style={[styles.passwordRow, errors.passwordConfirm && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPasswordConfirm}
                value={form.passwordConfirm}
                onChangeText={(v) => update('passwordConfirm', v)}
              />
              <Pressable
                hitSlop={10}
                onPress={() => setShowPasswordConfirm((s) => !s)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPasswordConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
            {errors.passwordConfirm && (
              <Text style={styles.errorText}>{errors.passwordConfirm}</Text>
            )}

            <Pressable
              style={styles.termsRow}
              onPress={() => {
                setAcceptedTerms((v) => !v);
                if (errors.terms) setErrors((e) => ({ ...e, terms: undefined }));
              }}
              hitSlop={6}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked,
                  errors.terms && !acceptedTerms && styles.checkboxError,
                ]}
              >
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={16} color={colors.background} />
                )}
              </View>
              <Text style={styles.termsText}>
                Ich akzeptiere die <Text style={styles.termsLink}>AGB</Text> und{' '}
                <Text style={styles.termsLink}>Datenschutzerklärung</Text>.
              </Text>
            </Pressable>
            {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || submitting) && { opacity: 0.85 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.primaryButtonText}>KONTO ERSTELLEN</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Schon registriert?</Text>
            <Link href="/(auth)/login" replace asChild>
              <Pressable hitSlop={6}>
                <Text style={styles.footerLink}>Anmelden</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brand: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 5,
  },
  tagline: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontSize: 13,
    letterSpacing: 1.5,
  },
  form: { width: '100%' },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  labelSpaced: { marginTop: spacing.md },
  input: {
    backgroundColor: '#200d14',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    color: colors.text,
    fontSize: 16,
  },
  inputError: { borderColor: colors.skip },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#200d14',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    color: colors.text,
    fontSize: 16,
  },
  eyeButton: { paddingLeft: spacing.sm },
  errorText: {
    color: colors.skip,
    fontSize: 12,
    marginTop: spacing.xs + 2,
    letterSpacing: 0.4,
  },
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm + 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#200d14',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxError: { borderColor: colors.skip },
  termsText: {
    color: colors.text,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  termsLink: { color: colors.accent, fontWeight: '600' },
  primaryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontWeight: '700',
    letterSpacing: 3,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs + 2,
  },
  footerText: { color: colors.textMuted, fontSize: 14 },
  footerLink: { color: colors.accent, fontSize: 14, fontWeight: '600' },
});
