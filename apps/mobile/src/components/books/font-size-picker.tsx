import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { FontSize } from '@/hooks/use-reader-progress';

const ITEMS: { value: FontSize; label: string; sample: number }[] = [
  { value: 'sm', label: '작게', sample: 13 },
  { value: 'md', label: '기본', sample: 16 },
  { value: 'lg', label: '크게', sample: 19 },
];

interface FontSizePickerProps {
  value: FontSize;
  onChange: (size: FontSize) => void;
}

/**
 * 본문 글자 크기 3단계 라디오 그룹. 웹 FontSizePicker(reader.tsx:1230)와 동일한
 * UX. accessibilityRole='radio'로 스크린리더 호환.
 */
export function FontSizePicker({ value, onChange }: FontSizePickerProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="본문 글자 크기"
      style={[styles.group, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
    >
      {ITEMS.map((it) => {
        const active = value === it.value;
        return (
          <Pressable
            key={it.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={it.label}
            onPress={() => onChange(it.value)}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: active ? theme.accent : 'transparent',
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <Text
              style={{
                fontSize: it.sample,
                fontWeight: '800',
                color: active ? '#FFFFFF' : theme.textSecondary,
              }}>
              A
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    padding: 2,
    gap: 2,
  },
  item: {
    width: 36,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
