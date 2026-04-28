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
        />
      </div>

      <div className="space-y-1.5">
        <Label>나이</Label>
        <div className="flex flex-wrap gap-2">
          {AGE_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAge(n)}
              disabled={pending}
              className={cn(
                'h-10 min-w-12 rounded-full px-4 text-sm font-medium transition-colors',
                age === n
                  ? 'bg-primary text-primary-foreground'
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

      <div className="space-y-1.5">
        <Label>아바타</Label>
        <div className="flex flex-wrap gap-2">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(emoji)}
              disabled={pending}
              className={cn(
                'flex size-11 items-center justify-center rounded-full text-2xl transition-all',
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

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? '만드는 중…' : '프로필 만들기'}
      </Button>
    </form>
  );
}
