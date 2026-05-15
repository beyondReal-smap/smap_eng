'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const AGE_OPTIONS = [5, 6, 7, 8, 9, 10] as const;
const AVATAR_OPTIONS = ['🦊', '🐰', '🐻', '🐼', '🦁', '🐯', '🐨', '🐸'] as const;

/**
 * 첫 프로필 생성 폼 — 이름·나이·아바타(emoji).
 * POST /api/profiles 는 session의 user.id를 서버에서 주입하므로 클라이언트는 user_id를 보내지 않는다.
 */
export function OnboardingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [age, setAge] = useState<(typeof AGE_OPTIONS)[number]>(7);
  const [avatar, setAvatar] = useState<string>(AVATAR_OPTIONS[0]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('이름을 입력해주세요');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed, age, avatar }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? '프로필 생성에 실패했어요');
        }
        toast.success('프로필이 만들어졌어요');
        router.replace('/');
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '알 수 없는 오류가 발생했어요',
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="child-name">아이 이름</Label>
        <Input
          id="child-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 지우"
          maxLength={30}
          required
          disabled={pending}
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label>나이</Label>
        {/* 6개 옵션: 모바일에서 flex-wrap이 들쭉날쭉했다.
            sm 미만에서는 grid-cols-3(2행 × 3열) 균등 배치 → 좁은 화면에서 정렬 안정.
            sm 이상에서는 grid-cols-6 한 줄로. */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {AGE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAge(n)}
              disabled={pending}
              className={cn(
                'flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition-colors',
                age === n
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-foreground hover:bg-muted/80',
                'disabled:opacity-50',
              )}
              aria-pressed={age === n}
            >
              {n}세
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>아바타</Label>
        {/* 8개 옵션: 모바일 grid-cols-4(2행), sm 이상에서 grid-cols-8 한 줄.
            각 셀 aspect-square로 정사각 유지, 화면 폭에 맞춰 자연스럽게 커진다. */}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(emoji)}
              disabled={pending}
              className={cn(
                'flex aspect-square items-center justify-center rounded-2xl text-2xl transition-all',
                avatar === emoji
                  ? 'bg-primary/15 ring-2 ring-primary'
                  : 'bg-muted hover:bg-muted/80',
                'disabled:opacity-50',
              )}
              aria-pressed={avatar === emoji}
              aria-label={`아바타 ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={pending} className="h-12 w-full text-base">
        {pending ? '만드는 중…' : '프로필 만들기'}
      </Button>
    </form>
  );
}
