import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/store';
import { colors } from '@/theme';

export default function AppLayout() {
  const { isAuthenticated, accessToken, isInitialized } = useAuthStore();

  // Kiểm tra token xác thực
  if (isInitialized && (!isAuthenticated || !accessToken)) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-transaction"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
