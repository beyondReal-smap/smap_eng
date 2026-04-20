'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Book, Passage } from '@/lib/db/schema';

interface Props {
  book: Book;
  passages: Passage[];
}

export function Reader({ book, passages }: Props) {
  const [idx, setIdx] = useState(0);
  const [showKo, setShowKo] = useState(false);

  const total = passages.length;
  const current = passages[idx];
  const progress = useMemo(
    () => (total > 0 ? ((idx + 1) / total) * 100 : 0),
    [idx, total],
  );
  const isLast = idx >= total - 1;

  if (!current) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
        이 책에는 아직 문장이 없어요.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {book.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{book.cefr}</Badge>
            <Badge variant="outline">{book.age}세</Badge>
            {book.topic ? (
              <span className="text-sm text-muted-foreground">
                {book.topic}
              </span>
            ) : null}
          </div>
        </div>
        <Link
          href="/"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          ← 책장
        </Link>
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {idx + 1} / {total} 문장
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <Card className="min-h-[220px]">
        <CardHeader>
          <CardTitle className="text-xl leading-relaxed sm:text-2xl">
            {current.textEn}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showKo ? (
            <p className="rounded-md bg-muted/60 p-3 text-base leading-relaxed">
              {current.textKo}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowKo((v) => !v)}
              size="sm"
            >
              {showKo ? '한글 해석 숨기기' : '한글 해석 보기'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled
              title="Kokoro TTS 연동 예정"
            >
              🔊 낭독 (곧 지원)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setIdx((i) => Math.max(0, i - 1));
            setShowKo(false);
          }}
          disabled={idx === 0}
        >
          ← 이전
        </Button>

        {isLast ? (
          <Link
            href={`/quiz/${book.id}`}
            className={buttonVariants({ size: 'lg' })}
          >
            🎉 다 읽었어요! 퀴즈 풀러 가기 →
          </Link>
        ) : (
          <Button
            onClick={() => {
              setIdx((i) => Math.min(total - 1, i + 1));
              setShowKo(false);
            }}
          >
            다음 →
          </Button>
        )}
      </div>
    </div>
  );
}
