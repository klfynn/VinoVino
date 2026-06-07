import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AuthScreenLayout, authFieldStyles as s } from '../components/AuthScreenLayout';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const inputStyle = (key: string) => [s.input, focused === key && s.inputFocused];

  const handleRegister = async () => {
    setError('');

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Bitte alle Felder ausfüllen.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Bitte eine gültige E-Mail-Adresse eingeben.');
      return;
    }
    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen haben.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    setLoading(true);
    try {
      await register({ firstName, lastName, email, password });
      // AuthGate detects new user (no TUTORIAL_SEEN_KEY) and redirects to onboarding
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registrierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Konto erstellen"
      subtitle="Werde Teil der VinoVino-Community."
      onBack={() => router.back()}
      footer={
        <View style={s.linkRow}>
          <Text style={s.linkMuted}>Bereits registriert?</Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={s.link}>Anmelden</Text>
            </TouchableOpacity>
          </Link>
        </View>
      }
    >
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.field}>
        <Text style={s.label}>Voller Name</Text>
        <TextInput
          style={inputStyle('fullName')}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Max Mustermann"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          onFocus={() => setFocused('fullName')}
          onBlur={() => setFocused(null)}
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>E-Mail</Text>
        <TextInput
          style={inputStyle('email')}
          value={email}
          onChangeText={setEmail}
          placeholder="deine@email.de"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused('email')}
          onBlur={() => setFocused(null)}
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Passwort</Text>
        <TextInput
          style={inputStyle('password')}
          value={password}
          onChangeText={setPassword}
          placeholder="Min. 6 Zeichen"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          onFocus={() => setFocused('password')}
          onBlur={() => setFocused(null)}
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Passwort bestätigen</Text>
        <TextInput
          style={inputStyle('confirmPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Passwort wiederholen"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          onFocus={() => setFocused('confirmPassword')}
          onBlur={() => setFocused(null)}
        />
      </View>

      <TouchableOpacity
        style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={s.primaryBtnText}>Registrieren</Text>
        )}
      </TouchableOpacity>
    </AuthScreenLayout>
  );
}
