'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import type { Profile } from '@/lib/db/schema';
import { useProfileStore } from '@/stores/profile';

const AVATAR_PRESETS = ['🦊', '🐻', '🐼', '🐱', '🐯', '🦁', '🐨', '🐰', '🦄', '🐢'];

export function ProfileSwitcher() {
  const currentProfileId = useProfileStore((s) => s.currentProfileId);
  const setCurrentProfile = useProfileStore((s) => s.setCurrentProfile);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ profiles: Profile[] }>('/api/profiles')
      .then((res) => {
        setProfiles(res.profiles);
        if (!currentProfileId && res.profiles[0]) {
          setCurrentProfile(res.profiles[0].id);
        }
      })
      .catch((err) => toast.error(`프로필 목록 로드 실패: ${err.message}`))
      .finally(() => setLoading(false));
  }, [currentProfileId, setCurrentProfile]);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('이름을 입력해 주세요');
      return;
    }
    setSubmitting(true);
    try {
      const { profile } = await apiFetch<{ profile: Profile }>(
        '/api/profiles',
        { method: 'POST', body: JSON.stringify({ name, avatar }) },
      );
      setProfiles((prev) => [...prev, profile]);
      setCurrentProfile(profile.id);
      setOpen(false);
      setName('');
      toast.success(`${profile.name} 프로필 추가!`);
    } catch (err) {
      toast.error(`생성 실패: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const current = profiles.find((p) => p.id === currentProfileId);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentProfileId?.toString() ?? ''}
        onValueChange={(v) => setCurrentProfile(Number(v))}
        disabled={loading || profiles.length === 0}
      >
        <SelectTrigger
          className="h-10 w-auto min-w-[160px] gap-2 rounded-full border-border/70 bg-card/70 px-3 glass-card transition hover:shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-primary/40"
        >
          {current ? (
            <span className="flex items-center gap-2">
              <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                <AvatarFallback className="bg-[color:var(--secondary)] text-base">
                  {current.avatar ?? '👤'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold">{current.name}</span>
            </span>
          ) : (
            <SelectValue
              placeholder={
                loading
                  ? '불러오는 중…'
                  : profiles.length === 0
                    ? '프로필 없음'
                    : '프로필 선택'
              }
            />
          )}
        </SelectTrigger>
        <SelectContent>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id.toString()}>
              <span className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-sm">
                    {p.avatar ?? '👤'}
                  </AvatarFallback>
                </Avatar>
                {p.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-full px-3 font-semibold press-scale"
            />
          }
        >
          <span className="mr-1 text-base leading-none">＋</span> 프로필
        </DialogTrigger>
        <DialogContent className="animate-pop-in">
          <DialogHeader>
            <DialogTitle className="text-xl">새 프로필 만들기</DialogTitle>
            <DialogDescription>
              가족 구성원을 추가하면 각자 책장과 독서 로그가 분리됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 민서"
                maxLength={30}
                className="h-11 rounded-xl"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>아바타</Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_PRESETS.map((a) => {
                  const active = a === avatar;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      aria-pressed={active}
                      aria-label={`아바타 ${a}`}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-2xl transition press-scale ${
                        active
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                          : 'border-border/60 hover:bg-muted'
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="rounded-xl"
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-xl press-scale"
            >
              {submitting ? '생성 중…' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
