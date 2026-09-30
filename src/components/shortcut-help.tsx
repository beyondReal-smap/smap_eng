'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Shortcut {
  keys: string[];
  label: string;
}

interface Section {
  title: string;
  items: Shortcut[];
}

const SECTIONS: Section[] = [
  {
    title: '📖 책 읽기',
    items: [
      { keys: ['←'], label: '이전 문장' },
      { keys: ['→'], label: '다음 문장' },
      { keys: ['Space'], label: '낭독 재생 / 일시정지' },
      { keys: ['K'], label: '한글 해석 토글' },
    ],
  },
  {
    title: '🧠 퀴즈',
    items: [
      { keys: ['1', '2', '3', '4'], label: '보기 선택 (A/B/C/D)' },
      { keys: ['Enter', '→'], label: '다음 / 제출' },
      { keys: ['←'], label: '이전 문제' },
    ],
  },
  {
    title: '⚙️ 전역',
    items: [{ keys: ['?'], label: '이 도움말 열기' }],
  },
];

export function ShortcutHelp() {
  const pathname = usePathname();
  const { status } = useSession();
  const [open, setOpen] = useState(false);

  // 전역 "?" 키로 토글 (입력 중이면 무시)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '?') return;
      const t = e.target;
      if (t instanceof HTMLElement) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable) return;
      }
      e.preventDefault();
      setOpen((v) => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 비로그인 랜딩('/')엔 단축키 대상(책·퀴즈) 화면이 없어 이 버튼이 무의미하고,
  // 랜딩 우하단 <AppInstallFab/>와 같은 좌표(fixed bottom-5 right-5)에 겹친다.
  // AppStoreBanner와 동일하게 비로그인 '/'에서만 미노출한다.
  // (세션은 layout에서 SSR 주입 → status 즉시 확정, hydration 깜빡임 없음)
  if (pathname === '/' && status !== 'authenticated') return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="키보드 단축키 안내"
            title="키보드 단축키 (?)"
            className="fixed bottom-5 right-5 z-40 hidden h-11 w-11 rounded-full bg-background/90 shadow-lg backdrop-blur press-scale sm:inline-flex"
          />
        }
      >
        <span className="text-base font-bold">?</span>
      </DialogTrigger>
      <DialogContent className="animate-pop-in sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">⌨️ 키보드 단축키</DialogTitle>
          <DialogDescription>
            마우스 없이 더 빠르게 읽고 풀 수 있어요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h4>
              <ul className="space-y-1.5">
                {section.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2"
                  >
                    <span className="text-sm">{item.label}</span>
                    <span className="flex gap-1">
                      {item.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="rounded-md border border-border/70 bg-background px-2 py-0.5 text-[11px] font-mono font-semibold shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          💡 입력창에 포커스가 있을 땐 단축키가 작동하지 않아요.
        </p>
      </DialogContent>
    </Dialog>
  );
}
