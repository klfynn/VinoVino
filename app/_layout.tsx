import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../context/AppContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { colors } from '../theme';

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = segments[0] === 'login' || segments[0] === 'register';

    if (!isAuthenticated && !inAuthScreen) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthScreen) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loading} pointerEvents="none">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return null;
}

function NavigatorContent() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <AuthGate />
    </>
  );
}

export default function RootLayout() {
  const [navigationReady, setNavigationReady] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppProvider>
            <StatusBar style="light" />
            {navigationReady ? (
              <NavigatorContent />
            ) : (
              <View
                style={styles.loading}
                onLayout={() => setNavigationReady(true)}
              >
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            )}
          </AppProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});
