import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * 스플래시 최소 노출 시간(ms).
 *
 * 로그인/가입/가드 라우팅이 너무 빨리 끝나면 splash가 한 프레임만 깜박이고 사라져
 * "버튼이 눌리긴 한 건가?" 인지 부담을 준다. splash-dot의 1주기(1500ms)와 정확히
 * 맞춰, 점 1→2→3 순서로 솟구치는 시퀀스가 한 번 끝까지 보인 뒤 라우팅이 일어나도록 한다.
 *
 * 사용처는 setTimeout으로 router.push/replace 또는 외부 signIn 호출을 지연시킨다.
 */
export const SPLASH_MIN_DURATION_MS = 1500;

type Props = {
  /** 보조 메시지 (예: "책장 열기", "로그인 중…"). 미지정 시 점 3개 펄스만 표시. */
  message?: string;
  /**
   * 풀스크린 오버레이 vs 카드 내부 인라인 두 가지 모드.
   * 라우트 전환·인증 가드처럼 "다음 화면으로 가는 사이"는 fullscreen,
   * 모달이나 카드 내 로딩은 inline.
   */
  variant?: "fullscreen" | "inline";
  className?: string;
};

/**
 * 앱 스플래시 — 브랜드 아이콘 + "하루책" + 부드러운 펄스 인디케이터.
 *
 * 등장 시점:
 *   - 라우트 전환 fallback (app/loading.tsx, book/loading.tsx 등)
 *   - 로그인 성공 직후 → 책장으로 라우팅되는 짧은 공백
 *   - 인증 가드(AuthRedirectGuard)의 router.replace 직전
 *
 * 시각 톤:
 *   - 배경: bg-background (light 모드 일관). 모바일 safe-area까지 채움.
 *   - 아이콘: BrandIcon과 동일한 sticker-shadow, 크기는 5rem (book_icon.png 기준 64×64 표시).
 *   - 펄스: 점 3개 stagger — "곧 도착함" 신호. spinner보다 어린이 친화적.
 */
export function AppSplash({
  message,
  variant = "fullscreen",
  className,
}: Props) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        variant === "fullscreen"
          ? "fixed inset-0 z-[100] grid place-items-center bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          : "grid w-full place-items-center py-16",
        // animate-fade-up 제거: layout.tsx의 <ViewTransition>이 이미 fade+slide를 처리하므로
        // splash 자체에서 한 번 더 솟아오르면 "움찔" 더블 모션이 된다(2026-04-26 피드백).
        className,
      )}
    >
      <div className="flex flex-col items-center gap-5">
        <span
          aria-hidden
          className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[1.5rem]"
          style={{
            background: "oklch(0.965 0.02 82)",
            boxShadow:
              "0 3px 0 oklch(0.75 0.03 258 / 0.45), 0 18px 36px oklch(0.5 0.08 82 / 0.18)",
          }}
        >
          <Image
            src="/book_icon.png"
            alt=""
            width={56}
            height={56}
            className="size-14 object-contain animate-splash-breathe"
          />
        </span>

        <div className="flex flex-col items-center gap-2">
          <span className="font-heading text-[1.4rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
            하루책
          </span>
          {message ? (
            <span className="text-[0.92rem] font-medium text-muted-foreground">
              {message}
            </span>
          ) : null}
        </div>

        <div
          aria-hidden
          className="mt-1 flex items-center gap-1.5"
        >
          {/*
           * 점이 한 번 솟구쳤다 내려오는 데 걸리는 시간(500ms = 1500ms 주기의 33%)만큼
           * stagger를 둬서 활동 구간이 겹치지 않게 한다. 1번이 ground에 닿는 순간
           * 2번이 출발 → 2번이 닿는 순간 3번이 출발 → 3번이 닿는 순간 다음 사이클의 1번이
           * 출발하는 끊김 없는 릴레이.
           *
           * delay는 인라인 style로 직접 지정. Tailwind v4가 `[animation-delay:Nms]`
           * arbitrary 클래스를 일관되게 picking하지 않아 빌드 CSS에서 누락되는 사례가 있어
           * "세 점이 동시에 뛰는" 회귀가 발생했었다.
           */}
          <span
            className="size-2 rounded-full bg-[color:var(--accent)] animate-splash-dot"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="size-2 rounded-full bg-[color:var(--accent)] animate-splash-dot"
            style={{ animationDelay: "500ms" }}
          />
          <span
            className="size-2 rounded-full bg-[color:var(--accent)] animate-splash-dot"
            style={{ animationDelay: "1000ms" }}
          />
        </div>
      </div>
    </div>
  );
}
