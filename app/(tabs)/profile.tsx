import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, spacing } from '../../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(false);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <Text style={styles.pageTitle}>Profil</Text>

        {/* Avatar + user info */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <Text style={styles.name}>
            {user ? `${user.firstName} ${user.lastName}` : ''}
          </Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </View>

        {/* Mein Konto */}
        <Text style={styles.sectionTitle}>MEIN KONTO</Text>
        <View style={styles.card}>
          {/* TODO: open address edit sheet once backend supports profile updates */}
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => {}}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Adresse bearbeiten</Text>
              {!!user?.address && (
                <Text style={styles.rowSub} numberOfLines={1}>{user.address}</Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Einstellungen */}
        <Text style={styles.sectionTitle}>EINSTELLUNGEN</Text>
        <View style={styles.card}>
          {/* TODO: wire up push notifications via expo-notifications when ready */}
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

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: { flex: 1 },
  rowLabel: { color: colors.text, fontSize: 15 },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chevron: { color: colors.textMuted, fontSize: 20, marginLeft: spacing.sm },

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
