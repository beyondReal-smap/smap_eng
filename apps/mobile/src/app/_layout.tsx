import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { getStoredMobileSession } from '@/lib/mobile-session';

const PUBLIC_SEGMENTS = new Set(['login', 'auth']);

function useAuthGate() {
  const segments = useSegments();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const firstSegment = segments[0];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getStoredMobileSession();
      if (cancelled) return;
      const authed = Boolean(session);
      const isPublic = PUBLIC_SEGMENTS.has(firstSegment ?? '');
      if (!authed && !isPublic) {
        router.replace('/login');
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [firstSegment, router]);

  return ready;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const ready = useAuthGate();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        {ready ? (
          <Stack
            screenOptions={{
              animation: 'slide_from_right',
              headerShadowVisible: false,
              headerTitleStyle: { fontWeight: '800' },
              contentStyle: { backgroundColor: colorScheme === 'dark' ? '#121417' : '#FFF8EA' },
            }}>
            <Stack.Screen name="index" options={{ title: '하루책', headerShown: false }} />
            <Stack.Screen name="login" options={{ title: '로그인' }} />
            <Stack.Screen name="auth/callback" options={{ title: '로그인 연결' }} />
            <Stack.Screen name="explore" options={{ title: '하루책 사용법' }} />
            <Stack.Screen name="vocab" options={{ title: '단어장' }} />
            <Stack.Screen name="stats" options={{ title: '통계' }} />
            <Stack.Screen name="parents" options={{ title: '보호자' }} />
            <Stack.Screen name="subscribe" options={{ title: '별 충전' }} />
            <Stack.Screen name="books/[bookId]" options={{ title: '읽기' }} />
            <Stack.Screen name="books/new" options={{ title: '새 책 만들기' }} />
            <Stack.Screen name="onboarding" options={{ title: '시작하기', headerShown: false }} />
            <Stack.Screen name="quiz/[bookId]" options={{ title: '퀴즈' }} />
          </Stack>
        ) : null}
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
