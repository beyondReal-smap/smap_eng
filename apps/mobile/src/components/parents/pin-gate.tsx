import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { PrimaryButton } from '@/components/common/primary-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useParentalPin } from '@/lib/parental-pin';

/**
 * 보호자 PIN 게이트(모바일) — 웹 ParentalPinGate와 정책 동일.
 *  - PIN 미설정: 4자리 설정(2회 입력 일치 확인)
 *  - PIN 설정 완료: 입력 확인
 *  - 통과 시 children 렌더, 30분 후 자동 잠금
 *
 * COPPA Level-1 — "아이 실수 진입 방지" 수준이며 VPC가 아니다.
 */
export function ParentalPinGate({ children }: { children: React.ReactNode }) {
  const pin = useParentalPin();
  const theme = useTheme();

  if (!pin.ready) {
    return (
      <View
        style={[
          styles.skeleton,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      />
    );
  }

  if (pin.unlocked) {
    return (
      <View style={styles.unlockedRoot}>
        <View
          style={[
            styles.unlockedBar,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <Text style={[styles.unlockedHint, { color: theme.textSecondary }]}>
            보호자 모드 · 30분 후 자동 잠금
          </Text>
          <Pressable
            onPress={pin.lock}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [
              styles.lockButton,
              {
                backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
              },
            ]}>
            <Text style={[styles.lockLabel, { color: theme.textSecondary }]}>
              지금 잠그기
            </Text>
          </Pressable>
        </View>
        {children}
      </View>
    );
  }

  if (pin.hasPin) {
    return (
      <VerifyForm
        onVerify={pin.verifyPin}
        onReset={() => {
          Alert.alert(
            'PIN 초기화',
            '저장된 PIN을 지울까요? 다시 접속하면 PIN을 새로 설정해야 합니다.',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '초기화',
                style: 'destructive',
                onPress: () => {
                  void pin.resetPin();
                },
              },
            ],
          );
        }}
      />
    );
  }

  return <SetupForm onSetup={pin.setPin} />;
}

interface PinInputProps
  extends Omit<TextInputProps, 'onChangeText' | 'value' | 'onChange'> {
  value: string;
  onChange: (v: string) => void;
}

/** 4자리 숫자 입력 — 웹과 동일한 트래킹/타뷸러 폰트 강조. */
const PinInput = forwardRef<TextInput, PinInputProps>(function PinInput(
  { value, onChange, autoFocus, ...rest },
  ref,
) {
  const theme = useTheme();
  return (
    <TextInput
      ref={ref}
      value={value}
      onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 4))}
      keyboardType="number-pad"
      maxLength={4}
      autoFocus={autoFocus}
      autoComplete="off"
      autoCorrect={false}
      secureTextEntry
      placeholder="••••"
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.pinInput,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          color: theme.text,
        },
      ]}
      {...rest}
    />
  );
});

function SetupForm({ onSetup }: { onSetup: (pin: string) => Promise<void> }) {
  const theme = useTheme();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  const p1Ref = useRef<TextInput>(null);

  useEffect(() => {
    p1Ref.current?.focus();
  }, []);

  async function submit() {
    if (p1.length !== 4) {
      Alert.alert('숫자 4자리를 입력하세요');
      return;
    }
    if (p1 !== p2) {
      Alert.alert('두 번 입력한 값이 달라요');
      return;
    }
    setBusy(true);
    try {
      await onSetup(p1);
    } catch (err) {
      const msg =
        err instanceof Error && err.message ? err.message : 'PIN을 저장하지 못했어요.';
      Alert.alert('설정 실패', msg);
      console.error('[parental-pin] setup failed:', err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Text style={[styles.title, { color: theme.text }]}>보호자 모드 설정</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        아이가 실수로 들어오지 않도록, 숫자 4자리 보호자 PIN을 만들어 주세요. PIN은
        이 기기에만 저장되며 서버로 전송되지 않아요.
      </Text>
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>PIN (숫자 4자리)</Text>
        <PinInput ref={p1Ref} value={p1} onChange={setP1} />
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>한 번 더 입력</Text>
        <PinInput value={p2} onChange={setP2} />
      </View>
      <PrimaryButton
        label={busy ? '저장 중…' : 'PIN 설정'}
        onPress={() => {
          void submit();
        }}
        disabled={busy || p1.length !== 4 || p2.length !== 4}
      />
    </View>
  );
}

function VerifyForm({
  onVerify,
  onReset,
}: {
  onVerify: (pin: string) => Promise<boolean>;
  onReset: () => void;
}) {
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (pin.length !== 4) return;
    setBusy(true);
    try {
      const ok = await onVerify(pin);
      if (!ok) {
        Alert.alert('PIN이 달라요');
        setPin('');
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message ? err.message : 'PIN을 확인하지 못했어요.';
      Alert.alert('확인 실패', msg);
      console.error('[parental-pin] verify failed:', err);
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Text style={[styles.title, { color: theme.text }]}>보호자 PIN</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>
        학습 리포트를 보려면 설정한 PIN 4자리를 입력해 주세요.
      </Text>
      <View style={styles.field}>
        <PinInput value={pin} onChange={setPin} autoFocus />
      </View>
      <PrimaryButton
        label={busy ? '확인 중…' : '잠금 해제'}
        onPress={() => {
          void submit();
        }}
        disabled={busy || pin.length !== 4}
      />
      <Pressable
        onPress={onReset}
        hitSlop={8}
        accessibilityRole="button"
        style={styles.resetRow}>
        <Text style={[styles.resetLabel, { color: theme.textSecondary }]}>
          PIN을 잊어버렸어요 (초기화)
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    height: 220,
    borderRadius: 24,
    borderWidth: 1,
    opacity: 0.6,
  },
  unlockedRoot: {
    gap: Spacing.three,
  },
  unlockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unlockedHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  lockButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  pinInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 16,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  resetRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  resetLabel: {
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
