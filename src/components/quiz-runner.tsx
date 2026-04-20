'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-client';
import type { Book, Quiz } from '@/lib/db/schema';

interface Props {
  book: Book;
  initialQuizzes: Quiz[];
}

type AnswerMap = Record<number, number>; // quizId -> selectedIdx

export function QuizRunner({ book, initialQuizzes }: Props) {
  const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 퀴즈가 없으면 최초 1회 자동 생성 트리거
  useEffect(() => {
    if (initialQuizzes.length > 0) return;
    setGenerating(true);
    apiFetch<{ quizzes: Quiz[] }>(`/api/books/${book.id}/quiz`, {
      method: 'POST',
    })
      .then((res) => setQuizzes(res.quizzes))
      .catch((err) => toast.error(`퀴즈 생성 실패: ${err.message}`))
      .finally(() => setGenerating(false));
  }, [book.id, initialQuizzes.length]);

  if (generating) {
    return (
      <EmptyState text="퀴즈를 만들고 있어요… (10~30초)" />
    );
  }
  if (quizzes.length === 0) {
    return <EmptyState text="아직 퀴즈가 없습니다." />;
  }

  const current = quizzes[idx];
  if (!current) return null;

  const selected = answers[current.id];
  const progress = ((idx + 1) / quizzes.length) * 100;
  const isLast = idx === quizzes.length - 1;

  if (submitted) {
    const correct = quizzes.filter(
      (q) => answers[q.id] === q.answerIndex,
    ).length;
    return (
      <section className="space-y-6">
        <ScoreHeader
          book={book}
          score={correct}
          total={quizzes.length}
        />
        <div className="space-y-4">
          {quizzes.map((q, i) => {
            const userIdx = answers[q.id];
            const isCorrect = userIdx === q.answerIndex;
            return (
              <Card key={q.id} className={isCorrect ? '' : 'border-red-500/40'}>
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2 text-base">
                    <span>
                      Q{i + 1}. {q.question}
                    </span>
                    <Badge variant={isCorrect ? 'secondary' : 'destructive'}>
                      {isCorrect ? '정답' : '오답'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {q.choices.map((c, ci) => (
                    <div
                      key={ci}
                      className={
                        ci === q.answerIndex
                          ? 'text-green-700 dark:text-green-400'
                          : ci === userIdx
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-muted-foreground'
                      }
                    >
                      {ci === q.answerIndex ? '✅ ' : ci === userIdx ? '❌ ' : '   '}
                      {c}
                    </div>
                  ))}
                  {q.explanation ? (
                    <p className="mt-2 rounded-md bg-muted/60 p-2 text-xs">
                      💡 {q.explanation}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/book/${book.id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            다시 읽기
          </Link>
          <Link href="/" className={buttonVariants()}>
            책장으로
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            🧠 {book.title} · 퀴즈
          </h1>
          <p className="text-xs text-muted-foreground">
            4지선다 {quizzes.length}문제
          </p>
        </div>
        <Link
          href={`/book/${book.id}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          ← 돌아가기
        </Link>
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {idx + 1} / {quizzes.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-relaxed">
            Q{idx + 1}. {current.question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selected !== undefined ? selected.toString() : ''}
            onValueChange={(v) =>
              setAnswers((prev) => ({ ...prev, [current.id]: Number(v) }))
            }
            className="gap-3"
          >
            {current.choices.map((c, ci) => (
              <div
                key={ci}
                className="flex items-center gap-3 rounded-md border px-3 py-2 hover:bg-muted/40"
              >
                <RadioGroupItem value={ci.toString()} id={`q-${current.id}-${ci}`} />
                <Label
                  htmlFor={`q-${current.id}-${ci}`}
                  className="flex-1 cursor-pointer font-normal"
                >
                  {String.fromCharCode(65 + ci)}. {c}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
        >
          ← 이전
        </Button>
        {isLast ? (
          <Button
            onClick={() => setSubmitted(true)}
            disabled={Object.keys(answers).length < quizzes.length}
            size="lg"
          >
            제출
          </Button>
        ) : (
          <Button
            onClick={() => setIdx((i) => i + 1)}
            disabled={selected === undefined}
          >
            다음 →
          </Button>
        )}
      </div>
    </section>
  );
}

function ScoreHeader({
  book,
  score,
  total,
}: {
  book: Book;
  score: number;
  total: number;
}) {
  const ratio = score / total;
  const emoji = ratio === 1 ? '🏆' : ratio >= 0.6 ? '🎉' : '💪';
  const label =
    ratio === 1 ? '만점!' : ratio >= 0.6 ? '잘했어요' : '한 번 더 읽어볼까요?';
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CardTitle className="text-2xl">
          {emoji} {score} / {total}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {label} · {book.title}
        </p>
      </CardHeader>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
