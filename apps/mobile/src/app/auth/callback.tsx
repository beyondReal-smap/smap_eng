import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/common/primary-button';
import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import { Spacing } from '@/constants/theme';
import { exchangeMobileCode } from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';
import { saveMobileSession } from '@/lib/mobile-session';
import { takePendingPkceVerifier } from '@/lib/pkce';
import { useTheme } from '@/hooks/use-theme';

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function AuthCallbackScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
  }>();
  const [status, setStatus] = useState<'saving' | 'saved' | 'failed'>('saving');
  const [message, setMessage] = useState('모바일 세션을 저장하는 중입니다...');

  useEffect(() => {
    let cancelled = false;

    async function saveCallbackSession() {
      await Promise.resolve();
      const callbackError = firstParam(params.error);
      if (callbackError) {
        setStatus('failed');
        setMessage(callbackError);
        return;
      }

      const code = firstParam(params.code);
      try {
        if (!code) throw new Error('Missing mobile exchange code');
        const verifier = await takePendingPkceVerifier();
        const session = await exchangeMobileCode(code, verifier);
        await saveMobileSession(session);
        if (cancelled) return;
        setStatus('saved');
        setMessage('모바일 세션이 저장되었습니다.');
        blurActiveElement();
        router.replace('/');
      } catch (err) {
        if (cancelled) return;
        setStatus('failed');
        setMessage(err instanceof Error ? err.message : 'Invalid callback payload');
      }
    }

    void saveCallbackSession();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.error, router]);

  return (
    <Screen>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <StatusPill
          label={status === 'saved' ? '로그인됨' : status === 'failed' ? '실패' : '저장 중'}
          tone={status === 'failed' ? 'danger' : 'success'}
        />
        <Text style={[styles.title, { color: theme.text }]}>로그인 연결</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{message}</Text>
        {status === 'failed' ? (
          <PrimaryButton
            label="로그인으로 돌아가기"
            onPress={() => {
              blurActiveElement();
              router.replace('/login');
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.three,
    gap: 14,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
