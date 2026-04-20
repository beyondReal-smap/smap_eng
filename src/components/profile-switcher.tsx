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

  return (
    <div className="flex items-center gap-3">
      <Select
        value={currentProfileId?.toString() ?? ''}
        onValueChange={(v) => setCurrentProfile(Number(v))}
        disabled={loading || profiles.length === 0}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue
            placeholder={
              loading
                ? '불러오는 중…'
                : profiles.length === 0
                  ? '프로필 없음'
                  : '프로필 선택'
            }
          />
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
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          + 프로필
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 프로필</DialogTitle>
            <DialogDescription>
              가족 구성원을 추가하면 각자 책장과 독서 로그가 분리됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 민서"
                maxLength={30}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatar">아바타 (이모지 1~2자)</Label>
              <Input
                id="avatar"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                maxLength={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? '생성 중…' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
