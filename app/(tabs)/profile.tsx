import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, spacing } from '../../theme';

function initialsOf(firstName: string, lastName: string, email: string): string {
  const f = firstName.trim().charAt(0);
  const l = lastName.trim().charAt(0);
  const initials = `${f}${l}`.toUpperCase();
  if (initials) return initials;
  return email.trim().charAt(0).toUpperCase() || '?';
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);

  const onLogout = () => {
    Alert.alert(
      'Abmelden',
      'Möchtest du dich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Abmelden', style: 'destructive', onPress: () => logout() },
      ],
      { cancelable: true },
    );
  };

  const onEditAddress = () => {
    // TODO: Navigate to address edit screen.
    Alert.alert('Adresse bearbeiten', 'Adress-Editor folgt in Kürze.');
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nicht angemeldet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim() || 'VinoVino Gast';
  const hasAddress = !!(user.address.street || user.address.city);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(user.firstName, user.lastName, user.email)}</Text>
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <Text style={styles.sectionLabel}>MEIN KONTO</Text>
        <View style={styles.group}>
          <TouchableOpacity style={styles.row} onPress={onEditAddress} activeOpacity={0.7}>
            <Ionicons name="location-outline" size={22} color={colors.accent} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Adresse</Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {hasAddress
                  ? `${user.address.street}, ${user.address.zip} ${user.address.city}`
                  : 'Noch keine Adresse hinterlegt'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>EINSTELLUNGEN</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={22} color={colors.accent} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Benachrichtigungen</Text>
              <Text style={styles.rowSub}>Neue Weine & Empfehlungen</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={notifications ? colors.background : colors.textMuted}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={colors.text} />
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl + spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#3a1822',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
  },
  name: { color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  email: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  group: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowText: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  logoutBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutText: {
    color: colors.text,
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 14,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
