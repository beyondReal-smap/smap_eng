import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/common/primary-button';
import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import { createProfile, MobileApiError } from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';
import { useTheme } from '@/hooks/use-theme';

const PROFILE_AGES = ['5', '6', '7', '8', '9', '10'] as const;
const STEPS = [
  { n: 1, title: '아이 프로필', body: '이름, 나이, 영어 레벨, 좋아하는 이야기 소재를 살짝 알려주세요.' },
  { n: 2, title: '오늘의 동화', body: '아이에게 딱 맞는 새 영어 동화를 AI가 매일 한 권 만들어 드려요.' },
  { n: 3, title: '듣고 따라 읽기', body: '문장별 낭독과 한글 번역이 함께 나와 혼자서도 쉽게 읽어요.' },
  { n: 4, title: '퀴즈로 마무리', body: '읽은 내용 퀴즈와 단어 복습으로 오늘 읽기를 똑똑하게 닫아요.' },
] as const;
const AVATAR_PRESETS = ['⭐', '🦊', '🐻', '🐰', '🐼', '🦄'] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [age, setAge] = useState<(typeof PROFILE_AGES)[number]>('7');
  const [avatar, setAvatar] = useState<string>('⭐');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('아이 이름을 입력해 주세요.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createProfile({
        name: trimmed,
        age: Number(age),
        avatar: avatar.trim() || undefined,
      });
      blurActiveElement();
      router.replace('/');
    } catch (err) {
      if (err instanceof MobileApiError && err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : '아이 프로필을 만들지 못했습니다.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: theme.skyInk }]}>WELCOME</Text>
        <Text style={[styles.title, { color: theme.text }]}>
          반가워요!{'\n'}하루책 시작 준비를{'\n'}함께 해볼까요?
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          아이 정보를 알려주시면 매일 한 권, 딱 맞는 영어 동화를 만들어 드려요.
        </Text>
      </View>

      <View style={styles.stepGrid}>
        {STEPS.map((step, index) => (
          <View
            key={step.n}
            style={[styles.stepCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View
              style={[
                styles.stepNumber,
                {
                  backgroundColor:
                    index === 1
                      ? theme.sky
                      : index === 2
                        ? theme.peach
                        : index === 3
                          ? theme.mint
                          : theme.accent,
                },
              ]}>
              <Text style={[styles.stepNumberText, { color: theme.text }]}>{step.n}</Text>
            </View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
            <Text style={[styles.stepBody, { color: theme.textSecondary }]}>{step.body}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.formCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.subtitle, { color: theme.text }]}>아이 프로필 만들기</Text>
          <StatusPill label="첫 설정" tone="success" />
        </View>

        <Text style={[styles.label, { color: theme.text }]}>이름</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="아이 이름"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
        />

        <Text style={[styles.label, { color: theme.text }]}>나이</Text>
        <View style={styles.row}>
          {PROFILE_AGES.map((value) => {
            const selected = age === value;
            return (
              <Pressable
                key={value}
                onPress={() => setAge(value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}>
                <Text style={[styles.chipText, { color: theme.text }]}>{value}세</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>아바타</Text>
        <View style={styles.row}>
          {AVATAR_PRESETS.map((preset) => {
            const selected = avatar === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => setAvatar(preset)}
                style={[
                  styles.avatarChip,
                  {
                    backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}>
                <Text style={styles.avatarText}>{preset}</Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={[styles.errorText, { color: theme.warning }]}>{error}</Text> : null}

        <PrimaryButton
          label={creating ? '저장 중...' : '시작하기'}
          disabled={creating}
          onPress={handleCreate}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: 10,
    paddingTop: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  stepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stepCard: {
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 8,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  stepBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  avatarChip: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
