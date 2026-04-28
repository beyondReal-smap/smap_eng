'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * 라이트/다크/시스템 3단 토글. 3개 버튼 그룹(pill)으로 현재 선택을 강조.
 * SSR/CSR 일치 전까지 깜빡임을 막기 위해 mount 전엔 placeholder를 렌더.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="h-9 w-[104px] rounded-full border border-border/60 bg-card"
      />
    );
  }

  const items: Array<{ value: 'light' | 'dark' | 'system'; icon: React.ReactNode; label: string }> = [
    { value: 'light', icon: <Sun aria-hidden className="h-3.5 w-3.5" />, label: '라이트' },
    { value: 'dark', icon: <Moon aria-hidden className="h-3.5 w-3.5" />, label: '다크' },
    { value: 'system', icon: <Monitor aria-hidden className="h-3.5 w-3.5" />, label: '시스템' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="테마"
      className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card p-0.5"
    >
      {items.map((it) => {
        const active = theme === it.value;
        return (
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={it.label}
            title={it.label}
            onClick={() => setTheme(it.value)}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {it.icon}
          </button>
        );
      })}
    </div>
  );
}
