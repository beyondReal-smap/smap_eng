import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BookCard } from '@/components/books/book-card';
import { PrimaryButton } from '@/components/common/primary-button';
import { Spacing } from '@/constants/theme';
import {
  deleteBook,
  flagBook,
  regenerateBookCover,
  updateBookTitle,
  type Book,
  type BookProgressStat,
} from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';

interface BookManageCardProps {
  book: Book;
  stat?: BookProgressStat;
  onChanged: () => void;
}

export function BookManageCard({ book, stat, onChanged }: BookManageCardProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(book.title);
  const [reason, setReason] = useState(book.flaggedReason ?? '내용을 보호자가 확인해야 합니다.');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(label: string, action: () => Promise<void>) {
    setBusy(label);
    setMessage(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : `${label} 실패`);
    } finally {
      setBusy(null);
    }
  }

  async function saveTitle() {
    const next = title.trim();
    if (!next || next === book.title) return;
    await runAction('title', async () => {
      await updateBookTitle(book.id, next);
      setMessage('제목을 저장했습니다.');
    });
  }

  async function refreshCover() {
    await runAction('cover', async () => {
      await regenerateBookCover(book.id);
      setMessage('표지를 다시 만들었습니다.');
    });
  }

  async function reportBook() {
    const next = reason.trim();
    if (!next) {
      setMessage('신고 사유를 입력해 주세요.');
      return;
    }
    await runAction('flag', async () => {
      await flagBook(book.id, next);
      setMessage('보호자 리포트로 보냈습니다.');
    });
  }

  async function removeBook() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setMessage('한 번 더 누르면 책장에서 숨깁니다.');
      return;
    }
    await runAction('delete', async () => {
      await deleteBook(book.id);
      setMessage('책장에서 숨겼습니다.');
    });
  }

  return (
    <View style={styles.wrap}>
      <BookCard book={book} stat={stat} />
      <View style={[styles.panel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>책 관리</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
        />
        <View style={styles.actionGrid}>
          <PrimaryButton
            label={busy === 'title' ? '저장 중...' : '제목 저장'}
            variant="soft"
            disabled={busy !== null}
            onPress={saveTitle}
            style={styles.action}
          />
          <PrimaryButton
            label={busy === 'cover' ? '생성 중...' : '표지 다시'}
            variant="soft"
            disabled={busy !== null}
            onPress={refreshCover}
            style={styles.action}
          />
        </View>
        <TextInput
          value={reason}
          onChangeText={setReason}
          maxLength={120}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholder="신고 사유"
          placeholderTextColor={theme.textSecondary}
        />
        <View style={styles.actionGrid}>
          <PrimaryButton
            label={busy === 'flag' ? '보내는 중...' : '보호자 확인'}
            variant="soft"
            disabled={busy !== null}
            onPress={reportBook}
            style={styles.action}
          />
          <PrimaryButton
            label={busy === 'delete' ? '삭제 중...' : confirmDelete ? '숨김 확인' : '책 숨기기'}
            variant="soft"
            disabled={busy !== null}
            onPress={removeBook}
            style={styles.action}
          />
        </View>
        {message ? <Text style={[styles.message, { color: theme.warning }]}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 22,
    padding: Spacing.three,
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 46,
    paddingHorizontal: 13,
    fontSize: 14,
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
});
