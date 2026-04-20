'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api-client';
import type { Book, CefrLevel } from '@/lib/db/schema';

const AGES = [5, 6, 7, 8, 9, 10] as const;
const CEFRS: CefrLevel[] = ['A1', 'A2', 'B1'];

const TOPIC_SUGGESTIONS = [
  '숲속 친구들',
  '우주 모험',
  '바다 속 탐험',
  '용감한 공룡',
  '마법 학교',
  '요리사 곰',
];

interface Props {
  profileId: number | null;
  onCreated?: (book: Book) => void;
}

export function CreateBookDialog({ profileId, onCreated }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [age, setAge] = useState<number>(7);
  const [cefr, setCefr] = useState<CefrLevel>('A1');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!profileId) {
      toast.error('프로필을 먼저 선택해 주세요');
      return;
    }
    setLoading(true);
    const t0 = performance.now();
    try {
      const { book } = await apiFetch<{ book: Book }>('/api/books', {
        method: 'POST',
        body: JSON.stringify({
          profileId,
          level: { age, cefr },
          topic: topic.trim() || undefined,
        }),
      });
      const ms = Math.round(performance.now() - t0);
      toast.success(`"${book.title}" 생성 완료 (${(ms / 1000).toFixed(1)}s)`);
      setOpen(false);
      setTopic('');
      onCreated?.(book);
      router.push(`/book/${book.id}`);
    } catch (err) {
      toast.error(`생성 실패: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="lg"
            disabled={!profileId}
            className="rounded-full bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--chart-4)] text-primary-foreground shadow-lg press-scale disabled:opacity-60"
          />
        }
      >
        <span className="mr-1.5 text-lg leading-none">✨</span> 새 동화 만들기
      </DialogTrigger>
      <DialogContent className="animate-pop-in sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">새 동화 만들기</DialogTitle>
          <DialogDescription>
            연령과 영어 수준을 고르고 주제를 적으면 AI가 동화책 한 편을 만들어 드려요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* 연령 선택 */}
          <div className="grid gap-2">
            <Label>연령</Label>
            <div className="flex flex-wrap gap-1.5">
              {AGES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAge(a)}
                  aria-pressed={age === a}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition press-scale ${
                    age === a
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {a}세
                </button>
              ))}
            </div>
          </div>

          {/* CEFR 선택 */}
          <div className="grid gap-2">
            <Label>영어 수준 (CEFR)</Label>
            <div className="flex gap-1.5">
              {CEFRS.map((c) => {
                const lvl =
                  c === 'A1' ? 'level-a1' : c === 'A2' ? 'level-a2' : 'level-b1';
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCefr(c)}
                    aria-pressed={cefr === c}
                    className={`flex-1 rounded-2xl border px-4 py-2.5 text-center font-extrabold transition press-scale ${
                      cefr === c
                        ? `${lvl} border-transparent shadow-sm ring-2 ring-primary/30`
                        : 'border-border/60 bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 주제 */}
          <div className="grid gap-2">
            <Label htmlFor="topic">주제 (선택)</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 숲속 친구들, 우주 모험"
              maxLength={80}
              className="h-11 rounded-xl"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TOPIC_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTopic(s)}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-[color:var(--secondary)] hover:text-[color:var(--secondary-foreground)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="rounded-xl"
          >
            취소
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-xl press-scale bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--chart-4)] text-primary-foreground"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" />
                생성 중… (10~30초)
              </span>
            ) : (
              '✨ 생성'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
