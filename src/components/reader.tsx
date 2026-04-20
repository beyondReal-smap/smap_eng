'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiFetch } from '@/lib/api-client';
import type { Book, Passage } from '@/lib/db/schema';

interface Props {
  book: Book;
  passages: Passage[];
}

interface TtsResponse {
  passageId: number;
  audioPath: string;
  cached: boolean;
}

interface SceneResponse {
  passageId: number;
  sceneImagePath: string;
  cached: boolean;
}

export function Reader({ book, passages }: Props) {
  const [idx, setIdx] = useState(0);
  const [showKo, setShowKo] = useState(false);
  const [audioCache, setAudioCache] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const p of passages) {
      if (p.audioPath) initial[p.id] = p.audioPath;
    }
    return initial;
  });
  const [sceneCache, setSceneCache] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const p of passages) {
      if (p.sceneImagePath) initial[p.id] = p.sceneImagePath;
    }
    return initial;
  });
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [loadingScene, setLoadingScene] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const total = passages.length;
  const current = passages[idx];
  const progress = useMemo(
    () => (total > 0 ? ((idx + 1) / total) * 100 : 0),
    [idx, total],
  );
  const isLast = idx >= total - 1;
  const currentAudio = current ? audioCache[current.id] : undefined;
  const currentScene = current ? sceneCache[current.id] : undefined;

  useEffect(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, [idx]);

  async function handlePlay() {
    if (!current) return;
    if (currentAudio) {
      audioRef.current?.play().catch(() => void 0);
      return;
    }
    setLoadingAudio(true);
    try {
      const res = await apiFetch<TtsResponse>(`/api/tts/${current.id}`, {
        method: 'POST',
      });
      setAudioCache((prev) => ({ ...prev, [current.id]: res.audioPath }));
      setTimeout(() => {
        audioRef.current?.play().catch(() => void 0);
      }, 50);
    } catch (err) {
      toast.error(`낭독 준비 실패: ${(err as Error).message}`);
    } finally {
      setLoadingAudio(false);
    }
  }

  async function handleDrawScene() {
    if (!current || loadingScene) return;
    setLoadingScene(true);
    toast.info('🖼️ AI가 장면을 그리는 중… (30~60초)');
    try {
      const res = await apiFetch<SceneResponse>(
        `/api/image/passage/${current.id}`,
        { method: 'POST' },
      );
      setSceneCache((prev) => ({ ...prev, [current.id]: res.sceneImagePath }));
      toast.success('장면 완성! ✨');
    } catch (err) {
      toast.error(`장면 생성 실패: ${(err as Error).message}`);
    } finally {
      setLoadingScene(false);
    }
  }

  function go(delta: number) {
    setIdx((i) => Math.max(0, Math.min(total - 1, i + delta)));
    setShowKo(false);
  }

  if (!current) {
    return (
      <div className="rounded-3xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        이 책에는 아직 문장이 없어요.
      </div>
    );
  }

  const levelClass =
    book.cefr === 'A1'
      ? 'level-a1'
      : book.cefr === 'A2'
        ? 'level-a2'
        : 'level-b1';

  return (
    <div className="space-y-6 animate-fade-up">
      {/* 헤더 */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
            {book.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className={`${levelClass} rounded-full px-2.5 py-1 font-bold`}>
              {book.cefr}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">
              {book.age}세
            </span>
            {book.topic ? (
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                {book.topic}
              </span>
            ) : null}
          </div>
        </div>
        <Link
          href="/"
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'rounded-full press-scale',
          })}
        >
          ← 책장
        </Link>
      </header>

      {/* 진행도 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>
            {idx + 1} <span className="text-foreground/40">/</span> {total} 문장
          </span>
          <span className="tabular-nums text-primary">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2.5 rounded-full" />
      </div>

      {/* 문장 카드 */}
      <article
        key={idx}
        className="animate-pop-in relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:p-10"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[color:var(--accent)] opacity-30 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[color:var(--secondary)] opacity-40 blur-3xl"
        />
        <div className="relative">
          {currentScene ? (
            <div className="mb-5 overflow-hidden rounded-2xl border border-border/50 shadow-sm animate-pop-in">
              <Image
                src={currentScene}
                alt={current.textEn}
                width={1024}
                height={768}
                className="aspect-[4/3] w-full object-cover"
                priority={idx === 0}
                sizes="(max-width: 640px) 100vw, 640px"
              />
            </div>
          ) : null}

          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            Passage {idx + 1}
          </span>
          <p className="whitespace-pre-wrap text-2xl font-bold leading-relaxed text-foreground sm:text-[30px] sm:leading-[1.4]">
            {current.textEn}
          </p>

          <div
            className={`grid transition-all duration-300 ease-out ${
              showKo
                ? 'mt-5 grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <p className="rounded-2xl bg-[color:var(--secondary)]/60 p-4 text-base leading-relaxed text-[color:var(--secondary-foreground)]">
                {current.textKo}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowKo((v) => !v)}
              size="sm"
              className="rounded-full press-scale"
            >
              {showKo ? '한글 해석 숨기기' : '한글 해석 보기'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePlay}
              disabled={loadingAudio}
              className="rounded-full press-scale"
            >
              {loadingAudio
                ? '⏳ 준비 중…'
                : currentAudio
                  ? '🔊 다시 듣기'
                  : '🔊 낭독 듣기'}
            </Button>
            {!currentScene ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDrawScene}
                disabled={loadingScene}
                className="rounded-full press-scale"
              >
                {loadingScene ? '⏳ 그리는 중…' : '🖼️ 장면 그리기'}
              </Button>
            ) : null}
          </div>
          {currentAudio ? (
            <audio
              ref={audioRef}
              src={currentAudio}
              controls
              preload="auto"
              className="mt-4 w-full rounded-full"
            />
          ) : null}
        </div>
      </article>

      {/* 네비게이션 */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => go(-1)}
          disabled={idx === 0}
          className="rounded-full press-scale"
        >
          ← 이전
        </Button>

        {isLast ? (
          <Link
            href={`/quiz/${book.id}`}
            className={buttonVariants({
              size: 'lg',
              className:
                'rounded-full press-scale bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--chart-4)] text-primary-foreground shadow-lg',
            })}
          >
            🎉 다 읽었어요! 퀴즈 풀러 가기 →
          </Link>
        ) : (
          <Button
            onClick={() => go(1)}
            className="rounded-full press-scale"
          >
            다음 →
          </Button>
        )}
      </div>
    </div>
  );
}
