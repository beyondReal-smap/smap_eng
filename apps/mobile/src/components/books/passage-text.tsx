import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { VocabularyEntry } from '@/lib/api';

import type { FontSize } from '@/hooks/use-reader-progress';

const PASSAGE_FONT_STYLE: Record<FontSize, { fontSize: number; lineHeight: number }> = {
  sm: { fontSize: 22, lineHeight: 32 },
  md: { fontSize: 27, lineHeight: 38 },
  lg: { fontSize: 33, lineHeight: 46 },
};

const normalize = (w: string | null | undefined): string =>
  (w ?? '').trim().toLowerCase().replace(/[.,!?;:"']/g, '');

export function buildVocabMap(list: VocabularyEntry[] | null | undefined) {
  const map = new Map<string, VocabularyEntry>();
  if (!list) return map;
  for (const entry of list) {
    if (!entry?.word) continue;
    const key = normalize(entry.word);
    if (key && !map.has(key)) map.set(key, entry);
  }
  return map;
}

// 영문 본문을 단어/공백/구두점 토큰으로 분할. 웹 reader.tsx와 동일 정규식.
function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/(\w[\w'-]*)/g)
    .filter((t): t is string => typeof t === 'string' && t !== '');
}

interface PassageTextProps {
  text: string;
  vocabMap: Map<string, VocabularyEntry>;
  fontSize: FontSize;
}

/**
 * 본문을 토큰 단위로 렌더하면서 vocabMap에 매칭되는 단어는 Pressable로 감싸
 * 길게 누르면 의미 팝오버(Modal)를 띄운다.
 *
 * 웹의 Popover.Root → Pressable + Modal 조합으로 포팅. RN에서는 inline anchor를
 * 측정해 위치 조절하는 비용이 크므로 화면 중앙 카드형 Modal로 대체.
 */
export function PassageText({ text, vocabMap, fontSize }: PassageTextProps) {
  const theme = useTheme();
  const [activeEntry, setActiveEntry] = useState<VocabularyEntry | null>(null);
  const tokens = useMemo(() => tokenize(text), [text]);
  const fontStyle = PASSAGE_FONT_STYLE[fontSize];

  if (vocabMap.size === 0) {
    return (
      <Text style={[styles.passage, fontStyle, { color: theme.text }]}>{text}</Text>
    );
  }

  return (
    <>
      <Text style={[styles.passage, fontStyle, { color: theme.text }]}>
        {tokens.map((tok, i) => {
          const entry = vocabMap.get(normalize(tok));
          if (!entry) {
            return <Text key={i}>{tok}</Text>;
          }
          return (
            <Text
              key={i}
              accessibilityLabel={`${entry.word} 뜻 보기`}
              accessibilityRole="button"
              onPress={() => setActiveEntry(entry)}
              style={[
                styles.vocabWord,
                { color: theme.skyInk, textDecorationColor: theme.accent },
              ]}>
              {tok}
            </Text>
          );
        })}
      </Text>

      <Modal
        animationType="fade"
        transparent
        visible={!!activeEntry}
        onRequestClose={() => setActiveEntry(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActiveEntry(null)}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
            onPress={() => undefined}>
            <Text style={[styles.modalWord, { color: theme.accent }]}>
              {activeEntry?.word}
            </Text>
            <Text style={[styles.modalMeaning, { color: theme.text }]}>
              {activeEntry?.meaning}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveEntry(null)}
              style={[styles.modalClose, { backgroundColor: theme.accent }]}>
              <Text style={styles.modalCloseLabel}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  passage: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  vocabWord: {
    fontWeight: '800',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 10,
  },
  modalWord: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  modalMeaning: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '500',
  },
  modalClose: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  modalCloseLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
