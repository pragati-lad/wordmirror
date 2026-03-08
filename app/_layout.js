import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/authStore';
import colors from '../constants/colors';

export default function RootLayout() {
  const { user, loading, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inWordDetail = segments[0] === 'word';

    if (user && !inAuthGroup && !inWordDetail) {
      router.replace('/(tabs)/home');
    } else if (!user && (inAuthGroup || inWordDetail)) {
      router.replace('/login');
    }
  }, [user, loading, segments]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600', color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="word/[word]"
          options={{
            title: 'Word Details',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </>
  );
}
