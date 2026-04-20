'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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

const COVER_EMOJIS = [
  '🌳', '🐉', '🚀', '🦕', '🐳', '🧚', '🦖', '🐧', '🦉', '🌈',
  '🍄', '🐝', '🐞', '🦋', '🏰', '🌙', '⭐️', '🎈', '🪁', '🦊',
];

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
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <FilterGroup label="연령">
          <Select
            value={ageFilter || 'all'}
            onValueChange={(v) => setAgeFilter(!v || v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-[120px] rounded-full">
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
        </FilterGroup>
        <FilterGroup label="수준">
          <div className="flex gap-1 rounded-full border border-border/60 bg-card/70 p-1 glass-card">
            <LevelPill
              active={cefrFilter === ''}
              onClick={() => setCefrFilter('')}
            >
              전체
            </LevelPill>
            {CEFRS.map((c) => (
              <LevelPill
                key={c}
                level={c}
                active={cefrFilter === c}
                onClick={() => setCefrFilter(cefrFilter === c ? '' : c)}
              >
                {c}
              </LevelPill>
            ))}
          </div>
        </FilterGroup>
        <div className="ml-auto">
          <CreateBookDialog
            profileId={profileId}
            onCreated={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      {!profileId ? (
        <EmptyState
          emoji="👋"
          title="누가 읽을 거예요?"
          text="먼저 프로필을 선택하거나 추가해 주세요."
        />
      ) : loading ? (
        <SkeletonGrid />
      ) : books.length === 0 ? (
        <EmptyState
          emoji="📖"
          title="책장이 비어있어요"
          text='오른쪽 위 "✨ 새 동화 만들기"로 첫 이야기를 시작해 볼까요?'
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <BookCard
              key={b.id}
              book={b}
              onCoverGenerated={() => setRefreshKey((k) => k + 1)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Book Card ---------- */

function BookCard({
  book,
  onCoverGenerated,
}: {
  book: Book;
  onCoverGenerated?: () => void;
}) {
  const cover = useMemo(() => pickCover(book.id), [book.id]);
  const levelClass =
    book.cefr === 'A1'
      ? 'level-a1'
      : book.cefr === 'A2'
        ? 'level-a2'
        : 'level-b1';
  const hasCover = Boolean(book.coverImagePath);

  return (
    <Link
      href={`/book/${book.id}`}
      className="stagger-item group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-3xl"
    >
      <article className="press-scale relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-lg">
        {/* Cover */}
        <div
          className="relative aspect-[5/3] w-full overflow-hidden"
          style={hasCover ? undefined : { background: cover.bg }}
          aria-hidden={!hasCover}
        >
          {hasCover ? (
            <Image
              src={book.coverImagePath!}
              alt={book.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <>
              <div className="absolute inset-0 flex items-center justify-center text-7xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                {cover.emoji}
              </div>
              <CoverGenButton
                bookId={book.id}
                onGenerated={onCoverGenerated}
              />
            </>
          )}
          <span
            className={`${levelClass} absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-extrabold shadow-sm`}
          >
            {book.cefr}
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-foreground/80 backdrop-blur">
            {book.age}세
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-2 text-base font-extrabold leading-snug group-hover:text-primary">
            {book.title}
          </h3>
          {book.topic ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {book.topic}
            </p>
          ) : null}
          <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
            <time>{new Date(book.createdAt).toLocaleDateString('ko-KR')}</time>
            <span className="inline-flex items-center gap-1 font-semibold text-primary transition group-hover:translate-x-0.5">
              읽기 →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function CoverGenButton({
  bookId,
  onGenerated,
}: {
  bookId: number;
  onGenerated?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    toast.info('🎨 AI가 표지를 그리는 중… (30~60초)');
    try {
      await apiFetch(`/api/image/book/${bookId}/cover`, { method: 'POST' });
      toast.success('표지 완성! ✨');
      onGenerated?.();
    } catch (err) {
      toast.error(`표지 생성 실패: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      aria-label="AI로 표지 그리기"
      className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-bold text-foreground shadow-sm backdrop-blur press-scale hover:bg-background disabled:opacity-70"
    >
      {loading ? '⏳ 그리는 중…' : '🎨 표지 만들기'}
    </button>
  );
}

function pickCover(seed: number) {
  const palette = [
    'linear-gradient(135deg, oklch(0.9 0.12 25) 0%, oklch(0.92 0.1 60) 100%)',
    'linear-gradient(135deg, oklch(0.9 0.12 175) 0%, oklch(0.93 0.1 200) 100%)',
    'linear-gradient(135deg, oklch(0.9 0.11 145) 0%, oklch(0.93 0.08 80) 100%)',
    'linear-gradient(135deg, oklch(0.88 0.13 300) 0%, oklch(0.92 0.1 260) 100%)',
    'linear-gradient(135deg, oklch(0.92 0.12 85) 0%, oklch(0.9 0.11 45) 100%)',
    'linear-gradient(135deg, oklch(0.9 0.11 220) 0%, oklch(0.92 0.09 280) 100%)',
  ];
  return {
    bg: palette[seed % palette.length],
    emoji: COVER_EMOJIS[seed % COVER_EMOJIS.length],
  };
}

/* ---------- Filter helpers ---------- */

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function LevelPill({
  children,
  level,
  active,
  onClick,
}: {
  children: React.ReactNode;
  level?: CefrLevel;
  active: boolean;
  onClick: () => void;
}) {
  const lvlClass =
    level === 'A1'
      ? 'level-a1'
      : level === 'A2'
        ? 'level-a2'
        : level === 'B1'
          ? 'level-b1'
          : '';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative rounded-full px-3 py-1 text-xs font-bold transition ${
        active
          ? `${lvlClass || 'bg-primary text-primary-foreground'} shadow-sm`
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- States ---------- */

function EmptyState({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <div className="animate-pop-in rounded-3xl border border-dashed border-border/80 bg-card/50 p-12 text-center glass-card">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-4xl animate-float-soft">
        {emoji}
      </div>
      <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-3xl border border-border/60 bg-card"
        >
          <div className="shimmer aspect-[5/3] w-full" />
          <div className="space-y-2 p-4">
            <div className="shimmer h-4 w-3/4 rounded" />
            <div className="shimmer h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
