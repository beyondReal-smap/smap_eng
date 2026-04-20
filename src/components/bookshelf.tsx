'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api-client';
import type { Book, CefrLevel } from '@/lib/db/schema';
import { useProfileStore } from '@/stores/profile';
import { CreateBookDialog } from './create-book-dialog';

const AGES = [5, 6, 7, 8, 9, 10] as const;
const CEFRS: CefrLevel[] = ['A1', 'A2', 'B1'];

export function Bookshelf() {
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [ageFilter, setAgeFilter] = useState<string>('');
  const [cefrFilter, setCefrFilter] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!profileId) {
      setBooks([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ profileId: profileId.toString() });
    if (ageFilter) params.set('age', ageFilter);
    if (cefrFilter) params.set('cefr', cefrFilter);
    apiFetch<{ books: Book[] }>(`/api/books?${params}`)
      .then((res) => setBooks(res.books))
      .catch((err) => toast.error(`책장 로드 실패: ${err.message}`))
      .finally(() => setLoading(false));
  }, [profileId, ageFilter, cefrFilter, refreshKey]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">연령</span>
          <Select
            value={ageFilter || 'all'}
            onValueChange={(v) => setAgeFilter(!v || v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {AGES.map((a) => (
                <SelectItem key={a} value={a.toString()}>
                  {a}세
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">영어 수준</span>
          <Select
            value={cefrFilter || 'all'}
            onValueChange={(v) => setCefrFilter(!v || v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {CEFRS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <CreateBookDialog
            profileId={profileId}
            onCreated={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      {!profileId ? (
        <EmptyState text="먼저 프로필을 선택하거나 추가해 주세요." />
      ) : loading ? (
        <EmptyState text="책장 불러오는 중…" />
      ) : books.length === 0 ? (
        <EmptyState text='책장이 비어있어요. "새 동화 만들기"로 시작해 보세요.' />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <Link key={b.id} href={`/book/${b.id}`} className="focus:outline-none">
              <Card className="h-full transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">
                      {b.title}
                    </CardTitle>
                    <Badge variant="secondary">{b.cefr}</Badge>
                  </div>
                  {b.topic ? (
                    <CardDescription className="line-clamp-2">
                      {b.topic}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{b.age}세 수준</span>
                  <time>
                    {new Date(b.createdAt).toLocaleDateString('ko-KR')}
                  </time>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
