import type { CSSProperties } from 'react';

/**
 * Seeded SVG 커버 아트 — 10종 템플릿.
 * Codex 토론에서 확정된 "브랜드 소유 일러스트" P2 확장 버전.
 * 이모지 기반 커버(AI 티)와 FLUX 생성 커버 사이의 기본값.
 *
 * 각 템플릿은 2개의 CSS 변수(--c1, --c2)를 받아 seeded 색 변주.
 * 6가지 팔레트 × 10종 템플릿 = 60가지 시각 조합 → 50권까지 시각 반복감 미미.
 */

type Template =
  | 'landscape'
  | 'vehicle'
  | 'creature'
  | 'castle'
  | 'underwater'
  | 'garden'
  | 'night-sky'
  | 'forest-path'
  | 'balloon'
  | 'kite';

interface Props {
  seed: number;
  title: string;
}

const PALETTES: Array<[string, string]> = [
  ['oklch(0.88 0.10 82)',  'oklch(0.74 0.13 40)'],  // gold + warm coral
  ['oklch(0.86 0.09 145)', 'oklch(0.72 0.11 180)'], // spring green + teal
  ['oklch(0.88 0.08 220)', 'oklch(0.72 0.10 252)'], // sky + dusk blue
  ['oklch(0.88 0.10 25)',  'oklch(0.80 0.09 55)'],  // coral + mustard
  ['oklch(0.86 0.09 300)', 'oklch(0.72 0.11 260)'], // lavender + indigo
  ['oklch(0.90 0.06 92)',  'oklch(0.55 0.06 258)'], // paper cream + ink navy
];

const TEMPLATES: Template[] = [
  'landscape',
  'vehicle',
  'creature',
  'castle',
  'underwater',
  'garden',
  'night-sky',
  'forest-path',
  'balloon',
  'kite',
];

function pickVariant(seed: number) {
  const template = TEMPLATES[seed % TEMPLATES.length];
  const palette = PALETTES[Math.floor(seed / TEMPLATES.length) % PALETTES.length];
  return { template, palette };
}

export function CoverArt({ seed, title }: Props) {
  const { template, palette } = pickVariant(seed);
  const style: CSSProperties = {
    ['--c1' as string]: palette[0],
    ['--c2' as string]: palette[1],
    background: palette[0],
  };
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={style}
      role="img"
      aria-label={`${title} 표지`}
    >
      {template === 'landscape' ? <Landscape /> : null}
      {template === 'vehicle' ? <Vehicle /> : null}
      {template === 'creature' ? <Creature /> : null}
      {template === 'castle' ? <Castle /> : null}
      {template === 'underwater' ? <Underwater /> : null}
      {template === 'garden' ? <Garden /> : null}
      {template === 'night-sky' ? <NightSky /> : null}
      {template === 'forest-path' ? <ForestPath /> : null}
      {template === 'balloon' ? <Balloon /> : null}
      {template === 'kite' ? <Kite /> : null}
    </div>
  );
}

/** 풍경 — 언덕 3개 + 작은 나무. 주제: 자연/친구/모험. */
function Landscape() {
  return (
    <svg
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--c1)" />
          <stop offset="100%" stopColor="var(--c2)" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill="url(#sky)" />
      {/* 해/달 */}
      <circle cx="128" cy="28" r="10" fill="var(--c2)" opacity="0.55" />
      {/* 뒷 언덕 */}
      <path d="M0,75 Q40,55 80,68 T160,60 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.45" />
      {/* 앞 언덕 */}
      <path d="M0,85 Q30,72 60,80 T120,78 T160,82 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.75" />
      {/* 나무 2그루 */}
      <g transform="translate(34 70)">
        <rect x="3" y="10" width="2" height="10" fill="oklch(0.3 0.05 40)" />
        <circle cx="4" cy="8" r="7" fill="oklch(0.55 0.12 145)" />
      </g>
      <g transform="translate(96 68)">
        <rect x="3" y="12" width="2" height="10" fill="oklch(0.3 0.05 40)" />
        <circle cx="4" cy="10" r="6" fill="oklch(0.58 0.13 145)" />
      </g>
    </svg>
  );
}

/** 탈것 — 로켓. 주제: 여행/우주/판타지. */
function Vehicle() {
  return (
    <svg
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width="160" height="100" fill="var(--c1)" />
      {/* 별 */}
      <g fill="var(--c2)" opacity="0.55">
        <circle cx="18" cy="20" r="1.5" />
        <circle cx="40" cy="12" r="1" />
        <circle cx="130" cy="22" r="1.3" />
        <circle cx="148" cy="40" r="1.5" />
        <circle cx="20" cy="60" r="1" />
      </g>
      {/* 로켓 본체 */}
      <g transform="translate(64 22)">
        <path d="M16,0 C24,10 28,22 28,38 L4,38 C4,22 8,10 16,0 Z" fill="var(--c2)" />
        <circle cx="16" cy="20" r="5" fill="oklch(0.96 0.02 92)" opacity="0.9" />
        <path d="M4,38 L0,52 L10,48 Z" fill="var(--c2)" opacity="0.7" />
        <path d="M28,38 L32,52 L22,48 Z" fill="var(--c2)" opacity="0.7" />
        {/* 불꽃 */}
        <path d="M12,50 Q16,62 20,50 Z" fill="oklch(0.78 0.16 55)" />
      </g>
    </svg>
  );
}

/** 생물 — 동물 실루엣(여우) + 별. 주제: 동물/꿈. */
function Creature() {
  return (
    <svg
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width="160" height="100" fill="var(--c1)" />
      {/* 배경 언덕 */}
      <path d="M0,72 Q80,58 160,72 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.35" />
      {/* 달 */}
      <circle cx="30" cy="26" r="12" fill="var(--c2)" opacity="0.55" />
      <circle cx="26" cy="24" r="10" fill="var(--c1)" opacity="0.7" />
      {/* 여우 실루엣 */}
      <g transform="translate(80 42)" fill="var(--c2)">
        {/* 몸 */}
        <ellipse cx="14" cy="28" rx="22" ry="12" />
        {/* 머리 */}
        <path d="M-4,24 L4,10 L10,18 L20,10 L24,24 Z" />
        {/* 귀 */}
        <path d="M2,14 L4,4 L10,12 Z" />
        <path d="M18,12 L20,4 L26,14 Z" />
        {/* 꼬리 */}
        <path d="M34,22 Q48,22 44,8 Q38,16 30,20 Z" />
      </g>
      {/* 발 아래 풀 */}
      <g stroke="var(--c2)" strokeWidth="1" opacity="0.5">
        <line x1="90" y1="82" x2="90" y2="76" />
        <line x1="94" y1="82" x2="94" y2="78" />
        <line x1="100" y1="82" x2="100" y2="76" />
      </g>
    </svg>
  );
}

/** 성 — 주제: 왕국/기사/공주/모험. */
function Castle() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      {/* 구름 */}
      <g fill="var(--c2)" opacity="0.2">
        <ellipse cx="22" cy="20" rx="14" ry="5" />
        <ellipse cx="132" cy="14" rx="16" ry="5" />
      </g>
      {/* 언덕 */}
      <path d="M0,78 Q80,64 160,78 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.35" />
      {/* 성탑 3개 */}
      <g fill="var(--c2)">
        <rect x="52" y="44" width="12" height="34" />
        <path d="M48,44 L52,38 L56,44 L60,38 L64,44 Z" />
        <rect x="72" y="34" width="16" height="44" />
        <path d="M68,34 L72,26 L76,34 L80,26 L84,34 L88,26 L92,34 Z" />
        <rect x="96" y="44" width="12" height="34" />
        <path d="M92,44 L96,38 L100,44 L104,38 L108,44 Z" />
      </g>
      {/* 깃발 */}
      <g>
        <line x1="80" y1="26" x2="80" y2="18" stroke="var(--c2)" strokeWidth="1.2" />
        <path d="M80,18 L86,20 L80,22 Z" fill="oklch(0.72 0.18 25)" />
      </g>
      {/* 창문 */}
      <rect x="77" y="52" width="6" height="8" fill="var(--c1)" opacity="0.8" />
    </Svg>
  );
}

/** 물속 — 주제: 바다/모험/동물. */
function Underwater() {
  return (
    <Svg>
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--c1)" />
          <stop offset="100%" stopColor="var(--c2)" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill="url(#sea)" />
      {/* 웨이브 */}
      <g stroke="var(--c2)" strokeWidth="1" opacity="0.45" fill="none">
        <path d="M0,22 Q40,16 80,22 T160,22" />
        <path d="M0,34 Q40,30 80,34 T160,34" />
      </g>
      {/* 물고기 */}
      <g fill="var(--c2)">
        <ellipse cx="48" cy="58" rx="10" ry="5" />
        <path d="M38,58 L30,52 L30,64 Z" />
        <circle cx="52" cy="56" r="1" fill="var(--c1)" />
      </g>
      <g fill="var(--c2)" opacity="0.75">
        <ellipse cx="108" cy="72" rx="7" ry="3.5" />
        <path d="M101,72 L95,68 L95,76 Z" />
      </g>
      {/* 해초 */}
      <g stroke="var(--c2)" strokeWidth="2" fill="none" opacity="0.6">
        <path d="M20,100 Q18,90 22,82 Q18,76 22,68" />
        <path d="M140,100 Q138,92 142,84 Q138,76 142,70" />
      </g>
      {/* 버블 */}
      <g fill="var(--c1)" opacity="0.55">
        <circle cx="60" cy="44" r="2" />
        <circle cx="66" cy="38" r="1.5" />
        <circle cx="58" cy="30" r="1" />
      </g>
    </Svg>
  );
}

/** 꽃밭 — 주제: 친구/가족/소풍. */
function Garden() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      {/* 태양 */}
      <circle cx="134" cy="22" r="8" fill="var(--c2)" opacity="0.6" />
      {/* 들판 */}
      <path d="M0,72 Q80,62 160,72 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.35" />
      {/* 꽃 5송이 */}
      {[24, 52, 80, 108, 136].map((x, i) => (
        <g key={i} transform={`translate(${x} ${70 + (i % 2) * 4})`}>
          <line x1="0" y1="0" x2="0" y2="16" stroke="var(--c2)" strokeWidth="1" />
          <circle cx="0" cy="0" r="4" fill="var(--c2)" />
          <circle cx="0" cy="0" r="1.5" fill="var(--c1)" />
        </g>
      ))}
      {/* 나비 */}
      <g transform="translate(64 36)" fill="var(--c2)" opacity="0.8">
        <ellipse cx="-3" cy="0" rx="3" ry="4" />
        <ellipse cx="3" cy="0" rx="3" ry="4" />
        <line x1="0" y1="-3" x2="0" y2="3" stroke="var(--c1)" strokeWidth="1" />
      </g>
    </Svg>
  );
}

/** 밤하늘 — 주제: 꿈/잠/우주. */
function NightSky() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      {/* 달 */}
      <g transform="translate(128 24)">
        <circle cx="0" cy="0" r="11" fill="var(--c2)" />
        <circle cx="4" cy="-2" r="10" fill="var(--c1)" />
      </g>
      {/* 별 */}
      <g fill="var(--c2)">
        {[
          [22, 18, 1.8], [48, 12, 1], [74, 26, 1.4], [16, 44, 1.2],
          [42, 38, 1], [90, 14, 1.6], [106, 44, 1], [60, 54, 1.2],
          [30, 66, 1], [100, 70, 1.4],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      {/* 구름 실루엣 */}
      <path
        d="M0,88 Q30,80 60,86 T120,84 T160,88 L160,100 L0,100 Z"
        fill="var(--c2)"
        opacity="0.45"
      />
    </Svg>
  );
}

/** 숲길 — 주제: 모험/탐험. */
function ForestPath() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      {/* 길 */}
      <path d="M70,100 Q80,70 80,45 Q80,30 82,20" stroke="var(--c2)" strokeWidth="14" fill="none" opacity="0.3" strokeLinecap="round" />
      {/* 나무 여러 그루 — 원근감 */}
      {[
        [18, 60, 10], [36, 66, 12], [128, 62, 12],
        [144, 68, 14], [56, 50, 7], [108, 52, 8],
      ].map(([cx, cy, r], i) => (
        <g key={i} transform={`translate(${cx} ${cy})`}>
          <rect x="-1" y="0" width="2" height={r * 0.7} fill="oklch(0.3 0.05 40)" />
          <circle cx="0" cy="0" r={r} fill="var(--c2)" opacity={0.7 - i * 0.05} />
        </g>
      ))}
      {/* 하늘 조각 */}
      <path d="M0,0 L160,0 L160,28 Q80,20 0,28 Z" fill="var(--c1)" opacity="0.6" />
    </Svg>
  );
}

/** 열기구 — 주제: 여행/하늘. */
function Balloon() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      {/* 구름 */}
      <g fill="var(--c1)" opacity="0.75">
        <ellipse cx="24" cy="72" rx="18" ry="5" />
        <ellipse cx="128" cy="80" rx="22" ry="6" />
      </g>
      {/* 열기구 */}
      <g transform="translate(80 32)">
        <path d="M-20,0 C-20,-22 20,-22 20,0 C20,16 10,22 0,28 C-10,22 -20,16 -20,0 Z" fill="var(--c2)" />
        {/* 스트라이프 */}
        <path d="M-10,-18 C-10,8 -10,22 0,28 M10,-18 C10,8 10,22 0,28" stroke="var(--c1)" strokeWidth="1.5" fill="none" opacity="0.7" />
        {/* 바구니 */}
        <rect x="-6" y="30" width="12" height="8" fill="oklch(0.45 0.08 50)" />
        {/* 줄 */}
        <line x1="-10" y1="24" x2="-5" y2="30" stroke="var(--c2)" strokeWidth="0.6" />
        <line x1="10" y1="24" x2="5" y2="30" stroke="var(--c2)" strokeWidth="0.6" />
      </g>
      {/* 작은 새 */}
      <path d="M30,40 Q34,36 38,40 Q42,36 46,40" stroke="var(--c2)" strokeWidth="1" fill="none" opacity="0.7" />
    </Svg>
  );
}

/** 연 — 주제: 놀이/바람/봄. */
function Kite() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      {/* 언덕 */}
      <path d="M0,84 Q80,72 160,84 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.35" />
      {/* 연 줄 */}
      <path d="M60,86 Q72,60 96,36" stroke="var(--c2)" strokeWidth="0.8" fill="none" opacity="0.7" />
      {/* 연 (다이아몬드) */}
      <g transform="translate(96 30) rotate(20)">
        <polygon points="0,-18 14,0 0,18 -14,0" fill="var(--c2)" />
        <line x1="0" y1="-18" x2="0" y2="18" stroke="var(--c1)" strokeWidth="1" opacity="0.7" />
        <line x1="-14" y1="0" x2="14" y2="0" stroke="var(--c1)" strokeWidth="1" opacity="0.7" />
        {/* 꼬리 */}
        <path d="M0,18 Q4,24 0,30 Q-4,36 0,42" stroke="var(--c2)" strokeWidth="1" fill="none" opacity="0.6" />
      </g>
      {/* 해 */}
      <circle cx="28" cy="24" r="8" fill="var(--c2)" opacity="0.5" />
    </Svg>
  );
}

/** 공통 SVG 래퍼. */
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      {children}
    </svg>
  );
}
