import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, Address } from '../../context/AuthContext';
import { colors, radii, spacing } from '../../theme';

export default function ProfileScreen() {
  const { user, logout, updateAddress } = useAuth();
  const [notifications, setNotifications] = useState(false);

  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Deutschland');
  const [addressSaving, setAddressSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (user?.address) {
      setStreet(user.address.street ?? '');
      setZip(user.address.zip ?? '');
      setCity(user.address.city ?? '');
      setCountry(user.address.country ?? 'Deutschland');
    }
  }, [user?.address]);

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  const handleLogout = () => {
    Alert.alert(
      'Abmelden',
      'Möchtest du dich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Abmelden', style: 'destructive', onPress: () => logout() },
      ],
    );
  };

  const handleSaveAddress = async () => {
    if (!street.trim() || !zip.trim() || !city.trim() || !country.trim()) {
      Alert.alert('Fehlende Angaben', 'Bitte alle Adressfelder ausfüllen.');
      return;
    }
    setAddressSaving(true);
    try {
      const addr: Address = {
        street: street.trim(),
        zip: zip.trim(),
        city: city.trim(),
        country: country.trim(),
      };
      await updateAddress(addr);
      Alert.alert('Gespeichert', 'Deine Lieferadresse wurde gespeichert.');
    } finally {
      setAddressSaving(false);
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Profil</Text>

          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
            <Text style={styles.name}>
              {user ? `${user.firstName} ${user.lastName}` : ''}
            </Text>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
          </View>

          {/* Lieferadresse */}
          <Text style={styles.sectionTitle}>LIEFERADRESSE</Text>
          <View style={styles.card}>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Straße + Hausnummer</Text>
              <TextInput
                style={inputStyle('street')}
                value={street}
                onChangeText={setStreet}
                placeholder="z. B. Musterstraße 12"
                placeholderTextColor={colors.textMuted}
                onFocus={() => setFocusedField('street')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <View style={styles.row2Col}>
              <View style={[styles.fieldBlock, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.fieldLabel}>PLZ</Text>
                <TextInput
                  style={inputStyle('zip')}
                  value={zip}
                  onChangeText={setZip}
                  placeholder="12345"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={10}
                  onFocus={() => setFocusedField('zip')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <View style={[styles.fieldBlock, { flex: 2 }]}>
                <Text style={styles.fieldLabel}>Stadt</Text>
                <TextInput
                  style={inputStyle('city')}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Berlin"
                  placeholderTextColor={colors.textMuted}
                  onFocus={() => setFocusedField('city')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Land</Text>
              <TextInput
                style={inputStyle('country')}
                value={country}
                onChangeText={setCountry}
                placeholder="Deutschland"
                placeholderTextColor={colors.textMuted}
                onFocus={() => setFocusedField('country')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, addressSaving && styles.saveBtnDisabled]}
              onPress={handleSaveAddress}
              activeOpacity={0.8}
              disabled={addressSaving}
            >
              <Text style={styles.saveBtnText}>
                {addressSaving ? 'Speichern...' : 'Adresse speichern'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Einstellungen */}
          <Text style={styles.sectionTitle}>EINSTELLUNGEN</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.rowLabel}>Benachrichtigungen</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={notifications ? colors.background : colors.textMuted}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Abmelden</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },

  pageTitle: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.xl,
  },

  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#200d14',
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  initials: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  email: {
    color: colors.textMuted,
    fontSize: 14,
  },

  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: spacing.md,
  },

  fieldBlock: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1a0a0f',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  row2Col: {
    flexDirection: 'row',
  },
  saveBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: { color: colors.text, fontSize: 15 },

  logoutBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
