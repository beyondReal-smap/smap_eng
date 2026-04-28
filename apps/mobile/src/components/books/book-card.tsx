import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toApiAssetUrl, type Book, type BookProgressStat } from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';
import { useTheme } from '@/hooks/use-theme';

interface BookCardProps {
  book: Book;
  stat?: BookProgressStat;
}

export function BookCard({ book, stat }: BookCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const progress = Math.round((stat?.progressRatio ?? 0) * 100);
  const topic = book.topic ?? '자유 이야기';
  const coverUrl = toApiAssetUrl(book.coverImagePath);

  return (
    <Pressable
      onPress={() => {
        blurActiveElement();
        router.push({
          pathname: '/books/[bookId]',
          params: { bookId: String(book.id) },
        });
      }}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.78 : 1 }]}>
      <View style={[styles.cover, { backgroundColor: theme.sky }]}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.coverImage} contentFit="cover" />
        ) : (
          <Text style={[styles.coverText, { color: theme.skyInk }]}>{book.cefr}</Text>
        )}
        {coverUrl ? (
          <View style={[styles.levelBadge, { backgroundColor: theme.paperWarm, borderColor: theme.border }]}>
            <Text style={[styles.levelBadgeText, { color: theme.text }]}>{book.cefr}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          {book.title}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {topic} · {book.age}세
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.accent }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {progress > 0 ? `${progress}% 읽음` : '읽기 시작'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderRadius: 26,
    padding: 14,
    shadowColor: '#1F2933',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cover: {
    width: 74,
    minHeight: 98,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  coverText: {
    fontSize: 22,
    fontWeight: '800',
  },
  levelBadge: {
    position: 'absolute',
    left: 7,
    top: 7,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 23,
  },
  meta: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
