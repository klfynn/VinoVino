import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { AppProvider, useApp } from './context/AppContext';
import SwipeScreen from './screens/SwipeScreen';
import WatchlistScreen from './screens/WatchlistScreen';
import CartScreen from './screens/CartScreen';
import { colors } from './theme';

const Tab = createBottomTabNavigator();

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

function Tabs() {
  return (
    <Tab.Navigator
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
      <Tab.Screen
        name="ENTDECKEN"
        component={SwipeScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="wine-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="MERKLISTE"
        component={WatchlistScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="WARENKORB"
        component={CartScreen}
        options={{ tabBarIcon: ({ color, size }) => <CartIcon color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="light" />
          <NavigationContainer>
            <Tabs />
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
});
