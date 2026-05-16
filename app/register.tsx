import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AuthScreenLayout, authFieldStyles as s } from '../components/AuthScreenLayout';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const inputStyle = (key: string) => [s.input, focused === key && s.inputFocused];

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      await register({ firstName, lastName, email, password, address });
      router.replace('/(tabs)');
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

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>Vorname</Text>
          <TextInput
            style={inputStyle('firstName')}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Max"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            onFocus={() => setFocused('firstName')}
            onBlur={() => setFocused(null)}
          />
        </View>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>Nachname</Text>
          <TextInput
            style={inputStyle('lastName')}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Mustermann"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            onFocus={() => setFocused('lastName')}
            onBlur={() => setFocused(null)}
          />
        </View>
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
        <Text style={s.label}>Adresse</Text>
        <TextInput
          style={[inputStyle('address'), { minHeight: 80, textAlignVertical: 'top', paddingTop: 14 }]}
          value={address}
          onChangeText={setAddress}
          placeholder="Straße, PLZ, Stadt"
          placeholderTextColor={colors.textMuted}
          multiline
          onFocus={() => setFocused('address')}
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
