import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AuthScreenLayout, authFieldStyles as s } from '../components/AuthScreenLayout';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      title="Willkommen zurück"
      subtitle="Melde dich an und entdecke exquisite Weine."
      footer={
        <View style={s.linkRow}>
          <Text style={s.linkMuted}>Noch kein Konto?</Text>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <Text style={s.link}>Registrieren</Text>
            </TouchableOpacity>
          </Link>
        </View>
      }
    >
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.field}>
        <Text style={s.label}>E-Mail</Text>
        <TextInput
          style={[s.input, focused === 'email' && s.inputFocused]}
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
          style={[s.input, focused === 'password' && s.inputFocused]}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          onFocus={() => setFocused('password')}
          onBlur={() => setFocused(null)}
        />
      </View>

      <TouchableOpacity
        style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={s.primaryBtnText}>Anmelden</Text>
        )}
      </TouchableOpacity>
    </AuthScreenLayout>
  );
}
