import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/common/primary-button';
import { StatusPill } from '@/components/common/status-pill';
import { Spacing } from '@/constants/theme';
import { API_BASE_URL } from '@/lib/config';
import { clearStoredMobileSession, getStoredMobileSession, type MobileSession } from '@/lib/mobile-session';
import { useTheme } from '@/hooks/use-theme';

interface SessionCardProps {
  onChanged?: () => void;
}

function formatExpiry(expiresAtUnix: number): string {
  return new Date(expiresAtUnix * 1000).toLocaleString();
}

export function SessionCard({ onChanged }: SessionCardProps) {
  const theme = useTheme();
  const [session, setSession] = useState<MobileSession | null>(null);
  const [loading, setLoading] = useState(true);

  async function openWebLogin() {
    const loginUrl = new URL('/login', API_BASE_URL);
    loginUrl.searchParams.set('callbackUrl', '/mobile');
    await Linking.openURL(loginUrl.toString());
  }

  async function refreshSession() {
    setLoading(true);
    try {
      setSession(await getStoredMobileSession());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialSession() {
      try {
        const nextSession = await getStoredMobileSession();
        if (cancelled) return;
        setSession(nextSession);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    await clearStoredMobileSession();
    await refreshSession();
    onChanged?.();
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          {Platform.OS === 'web' ? '웹 세션' : '모바일 세션'}
        </Text>
        <StatusPill
          label={session ? '로그인됨' : '게스트'}
          tone={session ? 'success' : 'warning'}
        />
      </View>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        API: {API_BASE_URL}
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        {Platform.OS === 'web'
          ? loading
            ? '브라우저 세션을 확인하는 중...'
            : session
              ? `만료: ${formatExpiry(session.expiresAtUnix)}`
              : '저장된 웹 세션이 없습니다.'
          : loading
            ? '기기 세션을 확인하는 중...'
            : session
              ? `만료: ${formatExpiry(session.expiresAtUnix)}`
              : '저장된 모바일 세션이 없습니다.'}
      </Text>
      {session ? (
        <PrimaryButton label="이 기기에서 로그아웃" variant="soft" onPress={signOut} />
      ) : Platform.OS === 'web' ? (
        <PrimaryButton label="웹 로그인으로 이동" variant="soft" onPress={openWebLogin} />
      ) : (
        <Text style={[styles.note, { color: theme.warning }]}>모바일 로그인 후 책장을 불러올 수 있습니다.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.three,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
});
