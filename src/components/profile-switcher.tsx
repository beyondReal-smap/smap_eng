'use client';

import { Popover } from '@base-ui/react/popover';
import { Check, ChevronDown, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api-client';
import type { Profile } from '@/lib/db/schema';
import { APP_HOME } from '@/lib/paths';
import { useProfileStore } from '@/stores/profile';

const AVATAR_PRESETS = ['🦊', '🐻', '🐼', '🐱', '🐯', '🦁', '🐨', '🐰', '🦄', '🐢'];
const AGE_OPTIONS = [5, 6, 7, 8, 9, 10] as const;
type ProfileSwitcherVariant = 'popover' | 'inline';

/**
 * 프로필 전환 — Popover 기반.
 * 기본 `<Select>` 드롭다운이 폼 엘리먼트처럼 어색하게 보였다는 피드백을 반영해
 * 현재 프로필 칩을 트리거로 두고, Popover 안에 가족 구성원 리스트 + 추가 액션을 둔다.
 */
export function ProfileSwitcher({
  variant = 'popover',
  onProfileSelected,
  onAddProfileClick,
}: {
  variant?: ProfileSwitcherVariant;
  onProfileSelected?: () => void;
  /**
   * inline 변형에서 '프로필 추가'를 누른 직후 호출되는 콜백.
   * 부모(예: MobileMenu)가 자신을 닫아 다이얼로그를 가리지 않도록 한다.
   * 모바일 햄버거 메뉴 Popover(z-70)가 Dialog(z-50)를 덮어버리던 버그(2026-05-14) 해결용.
   */
  onAddProfileClick?: () => void;
} = {}) {
  const router = useRouter();
  const currentProfileId = useProfileStore((s) => s.currentProfileId);
  const setCurrentProfile = useProfileStore((s) => s.setCurrentProfile);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    apiFetch<{ profiles: Profile[] }>('/api/profiles')
      .then((res) => {
        setProfiles(res.profiles);
        // 현재 선택된 프로필이 없거나 삭제됐으면 첫 번째로 fallback
        const pick =
          res.profiles.find((p) => p.id === currentProfileId) ??
          res.profiles[0];
        if (pick) setCurrentProfile(pick.id, pick.age);
        else setCurrentProfile(null, null);
      })
      .catch((err) => toast.error(`프로필 로드 실패: ${err.message}`))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = profiles.find((p) => p.id === currentProfileId);

  function selectProfile(p: Profile) {
    const changed = p.id !== currentProfileId;
    setCurrentProfile(p.id, p.age);
    setPopoverOpen(false);
    onProfileSelected?.();
    // 프로필이 실제로 바뀌었을 때만 책장으로 이동.
    // /vocab, /book/[id] 등 다른 페이지에 머물러 이전 프로필 데이터가 보이거나
    // 권한 문제로 401/404 나는 것을 방지 (2026-04-27 피드백).
    if (changed) router.push(APP_HOME);
  }

  function handleCreated(profile: Profile) {
    setProfiles((prev) => [...prev, profile]);
    setCurrentProfile(profile.id, profile.age);
    setAddOpen(false);
    setPopoverOpen(false);
    onProfileSelected?.();
    // 새 프로필의 책장(빈 상태)으로 이동.
    router.push(APP_HOME);
  }

  if (variant === 'inline') {
    // 중요: 이 변형은 모바일 햄버거 메뉴(Popover.Popup) 내부에 마운트된다.
    // AddProfileDialog를 이 컴포넌트 안에 함께 렌더하면 메뉴가 닫힐 때 React tree에서
    // ProfileSwitcher 전체가 unmount되어 다이얼로그도 함께 사라진다(2026-05-14 버그).
    // 그래서 inline 변형은 다이얼로그 렌더와 state를 부모(MobileMenu)에 완전 위임한다.
    return (
      <div className="grid gap-1.5 rounded-xl border border-border/60 bg-muted/25 p-1.5">
        <p className="px-2 pt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          프로필
        </p>
        {loading ? (
          <div className="h-11 animate-pulse rounded-lg bg-muted/70" />
        ) : profiles.length === 0 ? (
          <p className="rounded-lg px-2 py-2 text-xs text-muted-foreground">
            아직 프로필이 없어요.
          </p>
        ) : (
          <ul className="grid gap-1">
            {profiles.map((p) => {
              const active = p.id === currentProfileId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectProfile(p)}
                    className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition ${
                      active ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-[color:var(--secondary)] text-lg">
                        {p.avatar ?? '👤'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">
                        {p.name}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                        {p.age}세
                      </p>
                    </div>
                    {active ? (
                      <Check aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="button"
          onClick={() => onAddProfileClick?.()}
          className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-medium text-foreground/80 transition hover:bg-muted"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <UserPlus aria-hidden className="h-4 w-4" />
          </span>
          프로필 추가
        </button>
      </div>
    );
  }

  return (
    <>
      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Popover.Trigger
          render={
            <button
              type="button"
              aria-label="프로필 전환"
              disabled={loading}
              // 2026-04-26 옵션 B: AuthHeader와 같은 `.landing-scope` 디자인 시스템에
              // 묶기 위해 .nav-pill(둥근 풀 + paper-warm + sticker-shadow) 토큰 사용.
              // .landing-scope 자손에서만 스타일이 적용되므로 SiteHeader 내부에서만
              // 정상 표시된다. (다른 컨텍스트에서 직접 사용하면 unstyled.)
              className="nav-pill"
            />
          }
        >
          {current ? (
            <>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-[color:var(--secondary)] text-base">
                  {current.avatar ?? '👤'}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[90px] truncate">{current.name}</span>
              <ChevronDown aria-hidden className="nav-pill-chev" />
            </>
          ) : (
            <>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-muted text-base">👤</AvatarFallback>
              </Avatar>
              <span style={{ color: 'var(--ink-soft)' }}>
                {loading ? '불러오는 중' : '프로필 없음'}
              </span>
            </>
          )}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={8} align="end">
            <Popover.Popup className="z-50 w-[260px] overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none animate-fade-up">
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                가족 프로필
              </p>
              {profiles.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  아직 프로필이 없어요.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {profiles.map((p) => {
                    const active = p.id === currentProfileId;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => selectProfile(p)}
                          className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition ${
                            active
                              ? 'bg-primary/10'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-[color:var(--secondary)] text-xl">
                              {p.avatar ?? '👤'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {p.age}세
                            </p>
                          </div>
                          {active ? (
                            <Check
                              aria-hidden
                              className="h-4 w-4 text-primary"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="my-1 h-px bg-border/60" />
              <button
                type="button"
                onClick={() => {
                  setAddOpen(true);
                  setPopoverOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-medium text-foreground/80 transition hover:bg-muted"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <UserPlus aria-hidden className="h-4 w-4" />
                </span>
                프로필 추가
              </button>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <AddProfileDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={handleCreated}
      />
    </>
  );
}

/* ---------- Add Profile Dialog ---------- */

/**
 * 프로필 추가 다이얼로그.
 *
 * inline 변형(`MobileMenu` 안)에서는 이 다이얼로그를 ProfileSwitcher 외부에 직접
 * 마운트해야 한다. ProfileSwitcher가 모바일 메뉴 Popover 내부에 있으므로 메뉴가
 * 닫히면 ProfileSwitcher 트리 전체가 unmount되어 다이얼로그도 함께 사라지기 때문.
 */
export function AddProfileDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (p: Profile) => void;
}) {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(7);
  const [avatar, setAvatar] = useState('🦊');
  const [submitting, setSubmitting] = useState(false);

  // 열 때마다 초기화
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      setName('');
      setAge(7);
      setAvatar('🦊');
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [open]);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('이름을 입력해 주세요');
      return;
    }
    setSubmitting(true);
    try {
      const { profile } = await apiFetch<{ profile: Profile }>(
        '/api/profiles',
        {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), age, avatar }),
        },
      );
      toast.success(`${profile.name} 프로필 추가!`);
      onCreated(profile);
    } catch (err) {
      toast.error(`생성 실패: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 프로필 만들기</DialogTitle>
          <DialogDescription>
            가족 구성원을 추가하면 각자 책장과 독서 로그가 분리됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">이름</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 민서"
              maxLength={30}
              className="h-12 rounded-md text-base"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label>연령</Label>
            {/* OnboardingForm과 동일 패턴: 모바일 3열, sm 이상 6열 균등 그리드.
                flex-wrap이 모바일 좁은 폭에서 마지막 줄에 한두 개만 떨어져 어색했다. */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {AGE_OPTIONS.map((a) => {
                const active = age === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAge(a)}
                    aria-pressed={active}
                    className={`flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition press-scale ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {a}세
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>아바타</Label>
            {/* 10개 옵션: 모바일 5열(2행), sm 이상 5열 그대로(고정 너비라 wrap 없음).
                aspect-square로 다이얼로그 폭에 따라 자연 스케일. */}
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_PRESETS.map((a) => {
                const active = a === avatar;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    aria-pressed={active}
                    aria-label={`아바타 ${a}`}
                    className={`flex aspect-square items-center justify-center rounded-2xl border text-2xl transition press-scale ${
                      active
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* 모바일에서는 버튼이 좁은 폭에 끼이지 않도록 세로 스택, sm 이상 가로 정렬.
            기본 액션(추가)을 위에 두어 엄지 터치 접근성 향상. */}
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-11 rounded-md sm:h-10"
          >
            취소
          </Button>
          <Button
            onClick={handleCreate}
            disabled={submitting}
            className="h-11 rounded-md press-scale sm:h-10"
          >
            {submitting ? '생성 중…' : '추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
