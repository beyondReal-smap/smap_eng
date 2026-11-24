'use client';

import { Popover } from '@base-ui/react/popover';
import type { FontSize } from './shared';

/** 삽화 위에 뜨는 유리 버튼 바탕 — 흰 72% + 배경 흐림 + 옅은 그림자(iOS readerGlass와 같은 값). */
export const READER_GLASS =
  'bg-white/72 shadow-[0_4px_12px_rgb(0_0_0/0.12)] backdrop-blur-md';

/**
 * 리더 "AA" 유리 버튼 — 글자 크기 3단계 + 자동재생을 한 팝오버에서 다룬다(그림책 리더, 2026-09-30).
 * 예전엔 데스크톱은 헤더의 글자 크기 라디오, 모바일은 톱니 팝오버로 나뉘어 있었는데
 * 네이티브처럼 상단 오른쪽 AA 하나로 모았다. 값은 Reader state + localStorage에만 영향.
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
  const items: Array<{ v: FontSize; label: string }> = [
    { v: 'sm', label: '작게' },
    { v: 'md', label: '기본' },
    { v: 'lg', label: '크게' },
  ];
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="글자 크기와 읽기 설정"
        className="group flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden
          className={`flex h-10 min-w-10 items-baseline justify-center gap-px rounded-full px-3 pt-[9px] text-haru-coral-ink transition-transform group-active:scale-95 motion-reduce:transition-none ${READER_GLASS}`}
        >
          <span className="text-[12px] font-bold leading-none">A</span>
          <span className="text-[17px] font-extrabold leading-none">A</span>
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" alignOffset={-4}>
          <Popover.Popup className="z-50 w-[260px] rounded-2xl border border-border bg-popover p-3 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none animate-fade-up">
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-1.5 px-1 text-xs font-bold text-muted-foreground">
                  글자 크기
                </p>
                <div
                  role="radiogroup"
                  aria-label="본문 글자 크기"
                  className="flex items-center gap-1 rounded-full border border-border/60 bg-haru-paper p-0.5"
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
                        className={`flex min-h-[44px] flex-1 items-center justify-center rounded-full px-2 font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
                  <p className="mb-1.5 px-1 text-xs font-bold text-muted-foreground">
                    자동재생
                  </p>
                  <button
                    type="button"
                    onClick={onAutoplayToggle}
                    aria-pressed={autoplay}
                    className={`flex min-h-[44px] w-full items-center justify-between rounded-xl border-2 px-3 py-2 text-left font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      autoplay
                        ? 'border-primary bg-haru-coral-soft text-haru-coral-ink'
                        : 'border-border bg-card text-foreground/80 hover:bg-muted'
                    }`}
                  >
                    <span>한 쪽 끝나면 다음 쪽으로</span>
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
