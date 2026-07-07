'use client';

import { Popover } from '@base-ui/react/popover';
import { MoreHorizontal } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { toast } from 'sonner';
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
import type { Book } from '@/lib/db/schema';

const IMAGE_GEN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_IMAGE_GEN === 'true';

interface Props {
  book: Book;
  onChanged: () => void;
}

/**
 * 책 카드 우하단 ⋯ 메뉴.
 * 제공 액션:
 *  - 제목 수정 (Dialog)
 *  - 커버 제거 (생성된 FLUX 커버를 치우고 seeded SVG 폴백으로 복귀)
 *  - 숨기기 (soft delete — 레코드 유지, 책장에서만 제외)
 *
 * 링크 카드 위에 올라가므로 stopPropagation/preventDefault 필수.
 */
const FLAG_REASONS = [
  { value: 'inaccurate', label: '내용이 부정확해요' },
  { value: 'inappropriate', label: '부적절한 표현이 있어요' },
  { value: 'scary', label: '아이에게 무서운 장면이 있어요' },
  { value: 'other', label: '기타' },
];

export function BookCardMenu({ book, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [flagReason, setFlagReason] = useState<string>(FLAG_REASONS[0].value);
  const [flagNote, setFlagNote] = useState('');
  const [newTitle, setNewTitle] = useState(book.title);
  const [busy, setBusy] = useState(false);

  function stopLinkNav(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function removeCover() {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ coverImagePath: null }),
      });
      toast.success('표지를 원래대로 되돌렸어요');
      setOpen(false);
      onChanged();
    } catch (err) {
      toast.error(`실패: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  /**
   * FLUX 재호출로 표지 재생성.
   * 사용자 취소 지원: AbortController로 요청을 중단할 수 있게 한다.
   * 모델 로드로 30~60초 이상 걸릴 수 있어 진행 중 토스트 + 취소 액션을 제공.
   */
  async function regenerateCover() {
    if (busy) return;
    if (!IMAGE_GEN_ENABLED) {
      toast.info('이미지 생성이 꺼져 있어요 (NEXT_PUBLIC_ENABLE_IMAGE_GEN)');
      return;
    }
    const controller = new AbortController();
    const toastId = toast.loading('새 표지를 그리는 중… (30~60초)', {
      action: {
        label: '취소',
        onClick: () => controller.abort(),
      },
      duration: Infinity,
    });
    setBusy(true);
    try {
      await apiFetch(`/api/image/book/${book.id}/cover`, {
        method: 'POST',
        body: JSON.stringify({ force: true }),
        signal: controller.signal,
      });
      toast.success('새 표지 완성', { id: toastId });
      setOpen(false);
      onChanged();
    } catch (err) {
      if (controller.signal.aborted) {
        toast.info('표지 생성을 취소했어요', { id: toastId });
      } else {
        toast.error(`재생성 실패: ${(err as Error).message}`, { id: toastId });
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/books/${book.id}`, { method: 'DELETE' });
      toast.success('책장에서 치웠어요');
      setDeleteOpen(false);
      setOpen(false);
      onChanged();
    } catch (err) {
      toast.error(`실패: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function submitFlag() {
    if (busy) return;
    const labelObj = FLAG_REASONS.find((r) => r.value === flagReason);
    const reason = [labelObj?.label ?? '기타', flagNote.trim()]
      .filter(Boolean)
      .join(' — ');
    setBusy(true);
    try {
      await apiFetch(`/api/books/${book.id}/flag`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      toast.success('신고했어요. 보호자 모드에서 확인할 수 있어요.');
      setFlagOpen(false);
      setOpen(false);
      setFlagNote('');
      onChanged();
    } catch (err) {
      toast.error(`실패: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveRename() {
    const t = newTitle.trim();
    if (!t || t === book.title) {
      setRenameOpen(false);
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/books/${book.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: t }),
      });
      toast.success('제목을 바꿨어요');
      setRenameOpen(false);
      setOpen(false);
      onChanged();
    } catch (err) {
      toast.error(`실패: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          render={
            <button
              type="button"
              onClick={stopLinkNav}
              aria-label="이 책 관리"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground/80 shadow-sm transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal aria-hidden className="h-4 w-4" />
            </button>
          }
        />
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="end">
            <Popover.Popup
              onClick={stopLinkNav}
              className="z-50 w-[200px] overflow-hidden rounded-md border border-border/60 bg-popover py-1 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-none animate-fade-up"
            >
              <MenuItem
                onClick={(e) => {
                  stopLinkNav(e);
                  setRenameOpen(true);
                }}
              >
                제목 수정
              </MenuItem>
              {IMAGE_GEN_ENABLED ? (
                <MenuItem
                  onClick={(e) => {
                    stopLinkNav(e);
                    void regenerateCover();
                  }}
                  disabled={busy}
                >
                  {book.coverImagePath ? '표지 다시 만들기' : '표지 만들기'}
                </MenuItem>
              ) : null}
              {book.coverImagePath ? (
                <MenuItem
                  onClick={(e) => {
                    stopLinkNav(e);
                    void removeCover();
                  }}
                  disabled={busy}
                >
                  표지 되돌리기
                </MenuItem>
              ) : null}
              <MenuItem
                onClick={(e) => {
                  stopLinkNav(e);
                  setFlagOpen(true);
                }}
                disabled={busy}
              >
                이 책 신고하기
              </MenuItem>
              <div className="my-1 h-px bg-border/60" />
              <MenuItem
                onClick={(e) => {
                  stopLinkNav(e);
                  setDeleteOpen(true);
                }}
                disabled={busy}
                destructive
              >
                책장에서 치우기
              </MenuItem>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      {/* 책장에서 치우기 확인 — iOS alert 스타일 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          showCloseButton={false}
          className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[300px]"
        >
          {/* 메시지 영역 — 중앙 정렬 */}
          <div className="px-5 pb-4 pt-6 text-center">
            <DialogTitle className="text-[17px] font-bold leading-tight">
              책장에서 치울까요?
            </DialogTitle>
            <DialogDescription className="mt-2 text-[13px] leading-snug text-muted-foreground">
              &ldquo;{book.title}&rdquo;을(를) 책장에서 숨깁니다. 데이터는 남지만
              책장·단어장·진도에서 보이지 않게 돼요.
            </DialogDescription>
          </div>
          {/* 액션 — 가로 분할 + 세로 divider */}
          <div className="grid grid-cols-2 border-t border-border">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={busy}
              className="py-3 text-[17px] text-primary transition hover:bg-muted disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={busy}
              className="border-l border-border py-3 text-[17px] font-semibold text-[color:var(--destructive)] transition hover:bg-muted disabled:opacity-50"
            >
              {busy ? '처리 중…' : '치우기'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        {/*
          Dialog는 DOM상 Portal로 <Link> 밖에 렌더되지만,
          React Synthetic Event는 JSX 트리 기준으로 bubble되어 부모 <Link>가
          클릭 이벤트를 받아 책 페이지로 이동하는 문제가 있었다.
          Content 단에서 전파를 전역 차단해 모든 하위 버튼/입력이 안전하게 만듦.
        */}
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>이 책을 신고할까요?</DialogTitle>
            <DialogDescription>
              신고된 책은 책장에서 숨겨지고, 보호자 모드에서 다시 검토할 수 있어요.
              동화 내용에 문제가 있을 때 이용해 주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <fieldset className="grid gap-1.5">
              <legend className="text-xs font-medium text-muted-foreground">
                사유
              </legend>
              {FLAG_REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-muted"
                >
                  <input
                    type="radio"
                    name="flag-reason"
                    value={r.value}
                    checked={flagReason === r.value}
                    onChange={() => setFlagReason(r.value)}
                    className="accent-primary"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </fieldset>
            <div className="grid gap-1.5">
              <Label htmlFor="flag-note">자세한 내용 (선택)</Label>
              <Input
                id="flag-note"
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value.slice(0, 80))}
                placeholder="예: 특정 장면이 아이에게 무서웠어요"
                className="h-10 rounded-md"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFlagOpen(false)}
              disabled={busy}
              className="rounded-md"
            >
              취소
            </Button>
            <Button
              onClick={submitFlag}
              disabled={busy}
              className="rounded-md"
            >
              {busy ? '신고 중…' : '신고'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>제목 수정</DialogTitle>
            <DialogDescription>
              책장과 Reader 상단에 표시되는 제목을 바꿉니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-1">
            <Label htmlFor="book-title">제목</Label>
            <Input
              id="book-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={120}
              autoFocus
              className="h-11 rounded-md"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={busy}
              className="rounded-md"
            >
              취소
            </Button>
            <Button
              onClick={saveRename}
              disabled={busy || !newTitle.trim()}
              className="rounded-md"
            >
              {busy ? '저장 중…' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  destructive,
}: {
  children: React.ReactNode;
  onClick: (e: MouseEvent) => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`block w-full px-3 py-2 text-left font-medium transition hover:bg-muted disabled:opacity-50 ${
        destructive ? 'text-[color:var(--destructive)]' : ''
      }`}
    >
      {children}
    </button>
  );
}
