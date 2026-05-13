import React, { useState } from 'react';
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

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'E-Mail erforderlich';
    else if (!EMAIL_REGEX.test(email.trim())) next.email = 'Ungültige E-Mail-Adresse';
    if (!password) next.password = 'Passwort erforderlich';
    else if (password.length < 6) next.password = 'Mindestens 6 Zeichen';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (e) {
      Alert.alert('Anmeldung fehlgeschlagen', 'Bitte überprüfe deine Eingaben.');
    } finally {
      setSubmitting(false);
    }
  };

  const onForgotPassword = () => {
    // TODO: Wire up password reset (Supabase/Firebase).
    Alert.alert(
      'Passwort vergessen',
      'Wir senden dir gleich Anweisungen zum Zurücksetzen an deine E-Mail-Adresse.',
    );
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
            <Text style={styles.tagline}>Willkommen zurück</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>E-MAIL</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="name@beispiel.de"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
              }}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={[styles.label, { marginTop: spacing.md }]}>PASSWORT</Text>
            <View style={[styles.passwordRow, errors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoComplete="password"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
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
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <Pressable onPress={onForgotPassword} style={styles.forgotWrap} hitSlop={8}>
              <Text style={styles.forgotText}>Passwort vergessen?</Text>
            </Pressable>

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
                <Text style={styles.primaryButtonText}>ANMELDEN</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Noch kein Konto?</Text>
            <Link href="/(auth)/register" replace asChild>
              <Pressable hitSlop={6}>
                <Text style={styles.footerLink}>Registrieren</Text>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl + spacing.md,
  },
  brand: {
    color: colors.accent,
    fontSize: 38,
    fontWeight: '300',
    letterSpacing: 6,
  },
  tagline: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontSize: 14,
    letterSpacing: 2,
  },
  form: { width: '100%' },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
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
  forgotWrap: { alignSelf: 'flex-end', marginTop: spacing.md },
  forgotText: {
    color: colors.accent,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  primaryButton: {
    marginTop: spacing.xl,
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
