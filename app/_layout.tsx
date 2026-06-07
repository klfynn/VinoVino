import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppProvider } from '../context/AppContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CellarProvider } from '../context/CellarContext';
import { FilterProvider } from '../context/FilterContext';
import { TutorialProvider, TUTORIAL_SEEN_KEY } from '../context/TutorialContext';
import CoachMarkOverlay from './tutorial/coachmarks';
import { colors } from '../theme';

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = segments[0] === 'login' || segments[0] === 'register';
    const inTutorial = segments[0] === 'tutorial';

    if (!isAuthenticated && !inAuthScreen && !inTutorial) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthScreen) {
      (async () => {
        const seen = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
        if (seen === 'true') {
          router.replace('/(tabs)');
        } else {
          router.replace('/tutorial/onboarding');
        }
      })();
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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <AuthProvider>
          <CellarProvider>
          <AppProvider>
            <FilterProvider>
              <TutorialProvider>
                <StatusBar style="light" />
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="login" options={{ headerShown: false }} />
                  <Stack.Screen name="register" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="tutorial/onboarding"
                    options={{ headerShown: false, gestureEnabled: false }}
                  />
                  <Stack.Screen
                    name="filter"
                    options={{ presentation: 'modal', headerShown: false }}
                  />
                  <Stack.Screen
                    name="checkout"
                    options={{ headerShown: false }}
                  />
                </Stack>
                <AuthGate />
                <CoachMarkOverlay />
              </TutorialProvider>
            </FilterProvider>
          </AppProvider>
          </CellarProvider>
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
