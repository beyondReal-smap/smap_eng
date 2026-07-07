'use client';

import { Popover } from '@base-ui/react/popover';
import { Settings2 } from 'lucide-react';
import type { FontSize } from './shared';

/**
 * 본문 글자 크기 3단계 선택. 접근성/아동 저시력 대응.
 * 값은 Reader state + localStorage('reader:font-size')에만 영향, 외부 페이지엔 영향 없음.
 */
export function FontSizePicker({
  value,
  onChange,
}: {
  value: FontSize;
  onChange: (v: FontSize) => void;
}) {
  const items: Array<{ v: FontSize; label: string; sample: string }> = [
    { v: 'sm', label: '작게', sample: 'A' },
    { v: 'md', label: '기본', sample: 'A' },
    { v: 'lg', label: '크게', sample: 'A' },
  ];
  const sampleSize: Record<FontSize, string> = {
    sm: 'text-[11px]',
    md: 'text-sm',
    lg: 'text-base',
  };
  return (
    <div
      role="radiogroup"
      aria-label="본문 글자 크기"
      className="hidden items-center gap-0.5 rounded-full border border-border/60 bg-card p-0.5 sm:inline-flex"
    >
      {items.map((it) => {
        const active = value === it.v;
        return (
          <button
            key={it.v}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={it.label}
            title={it.label}
            onClick={() => onChange(it.v)}
            className={`flex h-7 w-7 items-center justify-center rounded-full font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            } ${sampleSize[it.v]}`}
          >
            {it.sample}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 모바일(<640px) 전용 Reader 설정 버튼.
 * 헤더의 FontSizePicker는 데스크탑에서만 노출되므로, 모바일에서는 톱니 아이콘 버튼으로
 * Popover를 열어 폰트 크기 + 자동재생 토글을 한 곳에서 다룬다.
 * 본문 카드 안의 자동재생 버튼은 컨텐츠 흐름에 직접 묶여 있으므로 그대로 유지.
 */
export function ReaderSettingsButton({
  fontSize,
  onFontSizeChange,
  autoplay,
  onAutoplayToggle,
  isEndingStep,
}: {
  fontSize: FontSize;
  onFontSizeChange: (v: FontSize) => void;
  autoplay: boolean;
  onAutoplayToggle: () => void;
  isEndingStep: boolean;
}) {
  const items: Array<{ v: FontSize; label: string; sample: string }> = [
    { v: 'sm', label: '작게', sample: 'A' },
    { v: 'md', label: '기본', sample: 'A' },
    { v: 'lg', label: '크게', sample: 'A' },
  ];
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="읽기 설정"
        className="press-scale grid h-9 w-9 place-items-center rounded-full border-2 border-border bg-background text-foreground/80 transition hover:bg-muted hover:text-foreground sm:hidden"
      >
        <Settings2 aria-hidden className="size-4" strokeWidth={2.4} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" alignOffset={-4}>
          <Popover.Popup className="z-50 w-[260px] rounded-2xl border border-border bg-popover p-3 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none animate-fade-up">
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  글자 크기
                </p>
                <div
                  role="radiogroup"
                  aria-label="본문 글자 크기"
                  className="flex items-center gap-1 rounded-full border border-border/60 bg-card p-0.5"
                >
                  {items.map((it) => {
                    const active = fontSize === it.v;
                    return (
                      <button
                        key={it.v}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onFontSizeChange(it.v)}
                        className={`flex min-h-[44px] flex-1 items-center justify-center rounded-full px-2 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {it.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {!isEndingStep ? (
                <div>
                  <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    자동재생
                  </p>
                  <button
                    type="button"
                    onClick={onAutoplayToggle}
                    aria-pressed={autoplay}
                    className={`flex min-h-[44px] w-full items-center justify-between rounded-xl border-2 px-3 py-2 text-left font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      autoplay
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground/70 hover:bg-muted'
                    }`}
                  >
                    <span>한 문장 끝나면 다음 문장으로</span>
                    <span
                      aria-hidden
                      className={`ml-2 inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 transition ${
                        autoplay ? 'border-primary bg-primary' : 'border-border bg-muted'
                      }`}
                    >
                      <span
                        className={`inline-block size-3.5 rounded-full bg-background shadow-sm transition ${
                          autoplay ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
