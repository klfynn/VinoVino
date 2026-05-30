import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { useApp } from '../../context/AppContext';

function ScannerTabIcon() {
  return (
    <View style={scannerIconStyles.wrap}>
      <Ionicons name="scan-outline" size={30} color={colors.accent} />
    </View>
  );
}

const scannerIconStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});

function CartIcon({ color, size }: { color: string; size: number }) {
  const { cartCount } = useApp();
  return (
    <View>
      <Ionicons name="cart-outline" size={size} color={color} />
      {cartCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cartCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
          paddingBottom: 24,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          letterSpacing: 1.5,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ENTDECKEN',
          tabBarIcon: ({ color, size }) => <Ionicons name="wine-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'SCANNER',
          tabBarIcon: () => <ScannerTabIcon />,
          tabBarLabel: () => (
            <Text style={styles.scannerLabel}>SCANNER</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'MERKLISTE',
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'WARENKORB',
          tabBarIcon: ({ color, size }) => <CartIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '700',
  },
  scannerLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
