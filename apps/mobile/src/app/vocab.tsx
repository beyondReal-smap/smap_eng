import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { AudioButton } from '@/components/books/audio-button';
import { PrimaryButton } from '@/components/common/primary-button';
import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import { Spacing } from '@/constants/theme';
import {
  fetchProfiles,
  fetchVocabulary,
  synthesizeWordAudio,
  toApiAssetUrl,
  type Profile,
  type VocabEntry,
} from '@/lib/api';
import { readJsonState, writeJsonState } from '@/lib/local-state';
import { useTheme } from '@/hooks/use-theme';

const SrsItemSchema = z.object({
  dueAt: z.number(),
  intervalDays: z.number(),
});
const SrsStoreSchema = z.record(z.string(), SrsItemSchema);

type SrsStore = z.infer<typeof SrsStoreSchema>;
type Grade = 'again' | 'hard' | 'good';

function vocabKey(entry: VocabEntry): string {
  return `${entry.word.trim().toLowerCase()}::${entry.meaning.trim().toLowerCase()}`;
}

function dedupe(entries: VocabEntry[]): VocabEntry[] {
  const seen = new Set<string>();
  const out: VocabEntry[] = [];
  for (const entry of entries) {
    const key = vocabKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

function nextInterval(current: number, grade: Grade): number {
  if (grade === 'again') return 0;
  if (grade === 'hard') return Math.max(1, Math.ceil(current * 1.5));
  return Math.max(3, current === 0 ? 3 : Math.ceil(current * 2.2));
}

export default function VocabScreen() {
  const theme = useTheme();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [entries, setEntries] = useState<VocabEntry[]>([]);
  const [srs, setSrs] = useState<SrsStore>({});
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      setLoading(true);
      try {
        const nextProfiles = await fetchProfiles();
        if (cancelled) return;
        setProfiles(nextProfiles);
        setProfileId(nextProfiles[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '프로필을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfiles();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (profileId === null) return;
    const currentProfileId: number = profileId;
    let cancelled = false;

    async function loadDeck() {
      // 프로필 전환 시 깜빡임 방지: 직전 덱/카드 잔상을 즉시 비우고 로딩 UI로 전환.
      // (웹의 동등 동작과 맞춤 — 이전 프로필 단어가 잠깐 보이는 문제 차단)
      setEntries([]);
      setIdx(0);
      setFlipped(false);
      setAudioPath(null);
      setLoading(true);
      setError(null);
      try {
        const [nextEntries, nextSrs] = await Promise.all([
          fetchVocabulary(currentProfileId),
          readJsonState(`smap_eng.srs.${currentProfileId}`, SrsStoreSchema, {}),
        ]);
        if (cancelled) return;
        setEntries(dedupe(nextEntries));
        setSrs(nextSrs);
        setIdx(0);
        setFlipped(false);
        setAudioPath(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '단어장을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDeck();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const deck = useMemo(() => {
    const now = Date.now();
    const due = entries.filter((entry) => {
      const item = srs[vocabKey(entry)];
      return !item || item.dueAt <= now;
    });
    return due.length > 0 ? due : entries;
  }, [entries, srs]);

  const current = deck[idx] ?? null;

  async function speak() {
    if (!current) return;
    setSpeaking(true);
    setError(null);
    try {
      setAudioPath(await synthesizeWordAudio(current.word));
    } catch (err) {
      setError(err instanceof Error ? err.message : '단어 음성을 만들지 못했습니다.');
    } finally {
      setSpeaking(false);
    }
  }

  async function grade(gradeValue: Grade) {
    if (!current || !profileId) return;
    const key = vocabKey(current);
    const currentItem = srs[key] ?? { dueAt: 0, intervalDays: 0 };
    const intervalDays = nextInterval(currentItem.intervalDays, gradeValue);
    const dueAt = intervalDays === 0 ? Date.now() : Date.now() + intervalDays * 24 * 60 * 60 * 1000;
    const nextSrs = { ...srs, [key]: { intervalDays, dueAt } };
    setSrs(nextSrs);
    await writeJsonState(`smap_eng.srs.${profileId}`, nextSrs);
    setFlipped(false);
    setAudioPath(null);
    setIdx((idx + 1) % Math.max(1, deck.length));
  }

  return (
    <Screen>
      <View style={[styles.hero, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <StatusPill label="단어장" tone="success" />
        <Text style={[styles.title, { color: theme.text }]}>읽은 책의 단어를 다시 봅니다</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          웹 단어장처럼 누적 어휘를 모으고, 복습 결과는 이 기기에 저장합니다.
        </Text>
      </View>

      <View style={styles.profileRow}>
        {profiles.map((profile) => {
          const selected = profile.id === profileId;
          return (
            <Pressable
              key={profile.id}
              onPress={() => setProfileId(profile.id)}
              style={[
                styles.profileChip,
                {
                  backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}>
              <Text style={styles.avatar}>{profile.avatar ?? '⭐'}</Text>
              <Text style={[styles.profileName, { color: theme.text }]}>{profile.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <Text style={[styles.body, { color: theme.textSecondary }]}>단어장을 불러오는 중...</Text>
      ) : error ? (
        <Text style={[styles.error, { color: theme.warning }]}>{error}</Text>
      ) : current ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Text style={[styles.counter, { color: theme.textSecondary }]}>
            {idx + 1} / {deck.length} · 전체 {entries.length}개
          </Text>
          <Pressable onPress={() => setFlipped((value) => !value)} style={styles.wordBox}>
            <Text style={[styles.word, { color: theme.text }]}>{flipped ? current.meaning : current.word}</Text>
            <Text style={[styles.bookTitle, { color: theme.textSecondary }]}>{current.bookTitle}</Text>
          </Pressable>
          <View style={styles.actions}>
            <PrimaryButton label={speaking ? '음성 준비 중...' : '단어 듣기'} variant="soft" disabled={speaking} onPress={speak} />
            <AudioButton audioUrl={toApiAssetUrl(audioPath)} />
          </View>
          <View style={styles.actions}>
            <PrimaryButton label="몰라" variant="soft" onPress={() => grade('again')} />
            <PrimaryButton label="애매" variant="soft" onPress={() => grade('hard')} />
            <PrimaryButton label="알아요" onPress={() => grade('good')} />
          </View>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <StatusPill label="비어 있음" tone="warning" />
          <Text style={[styles.title, { color: theme.text }]}>아직 단어가 없습니다.</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>책을 만들고 읽으면 단어장이 채워집니다.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.four,
    gap: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  profileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profileChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    fontSize: 18,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '800',
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.three,
    gap: 14,
  },
  counter: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  wordBox: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  word: {
    textAlign: 'center',
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '800',
  },
  bookTitle: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
});
