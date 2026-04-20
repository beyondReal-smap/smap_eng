'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
        render={<Button size="lg" disabled={!profileId} />}
      >
        ✨ 새 동화 만들기
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 동화 생성</DialogTitle>
          <DialogDescription>
            연령과 영어 수준을 고르고 주제를 적으면 AI가 동화책 한 편을
            만듭니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>연령</Label>
              <Select
                value={age.toString()}
                onValueChange={(v) => setAge(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGES.map((a) => (
                    <SelectItem key={a} value={a.toString()}>
                      {a}세
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>영어 수준 (CEFR)</Label>
              <Select
                value={cefr}
                onValueChange={(v) => setCefr(v as CefrLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CEFRS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="topic">주제 (선택)</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 숲속 친구들, 우주 모험"
              maxLength={80}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            취소
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? '생성 중… (10~30초)' : '생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
