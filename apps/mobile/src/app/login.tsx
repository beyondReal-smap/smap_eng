import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/common/primary-button';
import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import { SessionCard } from '@/components/auth/session-card';
import { Spacing } from '@/constants/theme';
import { exchangeMobileCode, loginWithEmail } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { blurActiveElement } from '@/lib/focus';
import { createSessionFromCallback, saveMobileSession } from '@/lib/mobile-session';
import { createPkceChallenge, savePendingPkceVerifier, takePendingPkceVerifier } from '@/lib/pkce';
import { useTheme } from '@/hooks/use-theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<'google' | 'kakao' | null>(null);

  async function openMobileLogin(provider: 'google' | 'kakao') {
    setError(null);
    setOauthProvider(provider);
    try {
      const pkce = await createPkceChallenge();
      await savePendingPkceVerifier(pkce.verifier);
      const url = new URL(`${API_BASE_URL}/api/auth/mobile/start`);
      const redirectUri = 'smapeng://auth/callback';
      url.searchParams.set('provider', provider);
      url.searchParams.set('redirect', redirectUri);
      url.searchParams.set('code_challenge', pkce.challenge);
      url.searchParams.set('code_challenge_method', 'S256');
      const result = await WebBrowser.openAuthSessionAsync(url.toString(), redirectUri);

      if (result.type !== 'success') {
        setError('로그인이 취소되었습니다.');
        return;
      }

      const callbackUrl = new URL(result.url);
      const callbackError = callbackUrl.searchParams.get('error');
      if (callbackError) throw new Error(callbackError);

      const code = callbackUrl.searchParams.get('code');
      if (!code) throw new Error('로그인 콜백 코드가 없습니다.');

      const verifier = await takePendingPkceVerifier();
      const session = await exchangeMobileCode(code, verifier);
      await saveMobileSession(session);
      blurActiveElement();
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '모바일 로그인 준비에 실패했습니다.');
    } finally {
      setOauthProvider(null);
    }
  }

  async function openWebLogin() {
    const url = new URL('/login', API_BASE_URL);
    url.searchParams.set('callbackUrl', '/mobile');
    await Linking.openURL(url.toString());
  }

  async function submitEmailLogin() {
    const nextEmail = email.trim();
    if (!nextEmail || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setError(null);
    setEmailSubmitting(true);
    try {
      const session = await loginWithEmail({
        email: nextEmail,
        password,
      });
      await saveMobileSession(session);
      blurActiveElement();
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '이메일 로그인에 실패했습니다.');
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function saveDevelopmentToken() {
    setError(null);
    try {
      const expiresAtUnix = Number(expiresAt);
      const session = createSessionFromCallback(token.trim(), expiresAtUnix);
      await saveMobileSession(session);
      blurActiveElement();
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid token payload');
    }
  }

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <StatusPill label="하루책 로그인" tone="success" />
        <Text style={[styles.heroTitle, { color: theme.text }]}>아이 책장을 이어서 열어드릴게요</Text>
        <Text style={[styles.heroText, { color: theme.textSecondary }]}>웹 계정과 모바일 책장을 연결합니다.</Text>
      </View>

      <SessionCard />

      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          {Platform.OS === 'web' ? '웹 로그인' : '모바일 로그인'}
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          이메일 계정 또는 소셜 계정으로 로그인하면 책장과 학습 기록을 이어서 불러옵니다.
        </Text>
        <View style={styles.formStack}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="parent@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholderTextColor={theme.textSecondary}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            autoComplete="password"
            secureTextEntry
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholderTextColor={theme.textSecondary}
          />
          <PrimaryButton
            label={emailSubmitting ? '로그인 중...' : '이메일로 로그인'}
            disabled={emailSubmitting || oauthProvider !== null}
            onPress={submitEmailLogin}
          />
        </View>
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textSecondary }]}>또는</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>
        {Platform.OS === 'web' ? (
          <PrimaryButton label="웹 로그인으로 이동" onPress={openWebLogin} />
        ) : (
          <>
            <PrimaryButton
              label={oauthProvider === 'google' ? 'Google 여는 중...' : 'Google로 계속하기'}
              disabled={emailSubmitting || oauthProvider !== null}
              onPress={() => openMobileLogin('google')}
            />
            <PrimaryButton
              label={oauthProvider === 'kakao' ? 'Kakao 여는 중...' : 'Kakao로 계속하기'}
              variant="soft"
              disabled={emailSubmitting || oauthProvider !== null}
              onPress={() => openMobileLogin('kakao')}
            />
          </>
        )}
        {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      </View>

      {__DEV__ && Platform.OS !== 'web' ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>개발용 토큰</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            네이티브 로그인 API 점검용 입력입니다.
          </Text>
          <TextInput
            value={token}
            onChangeText={setToken}
            placeholder="mobile access token"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholderTextColor={theme.textSecondary}
          />
          <TextInput
            value={expiresAt}
            onChangeText={setExpiresAt}
            placeholder="expiresAtUnix"
            keyboardType="number-pad"
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholderTextColor={theme.textSecondary}
          />
          <PrimaryButton label="개발용 토큰 저장" variant="soft" onPress={saveDevelopmentToken} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 32,
    padding: Spacing.four,
    gap: 14,
  },
  formStack: {
    gap: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.three,
    gap: 12,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
});
