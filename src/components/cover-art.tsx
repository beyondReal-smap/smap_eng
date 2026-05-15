import type { CSSProperties } from 'react';

/**
 * Seeded SVG 커버 아트 — 24종 템플릿.
 * Codex 토론에서 확정된 "브랜드 소유 일러스트" P2 확장 버전.
 * 이모지 기반 커버(AI 티)와 FLUX 생성 커버 사이의 기본값.
 *
 * 각 템플릿은 3개의 CSS 변수(--c1, --c2, --c3)를 받아 seeded 색 변주.
 * 12가지 팔레트 × 24종 템플릿 = 288가지 시각 조합.
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
  | 'kite'
  | 'lighthouse'
  | 'train'
  | 'library'
  | 'robot'
  | 'mountain'
  | 'circus'
  | 'planet'
  | 'campfire'
  | 'rainy-window'
  | 'compass'
  | 'snow-village'
  | 'music'
  | 'magic-door'
  | 'treehouse';

interface Props {
  seed: number;
  title: string;
}

type Palette = [string, string, string];

const PALETTES: Palette[] = [
  ['oklch(0.88 0.10 82)',  'oklch(0.74 0.13 40)',  'oklch(0.96 0.04 100)'],
  ['oklch(0.86 0.09 145)', 'oklch(0.72 0.11 180)', 'oklch(0.94 0.04 160)'],
  ['oklch(0.88 0.08 220)', 'oklch(0.72 0.10 252)', 'oklch(0.96 0.03 230)'],
  ['oklch(0.88 0.10 25)',  'oklch(0.80 0.09 55)',  'oklch(0.96 0.04 35)'],
  ['oklch(0.86 0.09 300)', 'oklch(0.72 0.11 260)', 'oklch(0.96 0.03 315)'],
  ['oklch(0.90 0.06 92)',  'oklch(0.55 0.06 258)', 'oklch(0.96 0.03 96)'],
  ['oklch(0.84 0.08 190)', 'oklch(0.62 0.13 155)', 'oklch(0.94 0.04 185)'],
  ['oklch(0.86 0.09 12)',  'oklch(0.66 0.15 345)', 'oklch(0.96 0.04 20)'],
  ['oklch(0.84 0.09 250)', 'oklch(0.68 0.12 310)', 'oklch(0.95 0.03 265)'],
  ['oklch(0.89 0.08 120)', 'oklch(0.63 0.12 95)',  'oklch(0.97 0.04 115)'],
  ['oklch(0.86 0.08 42)',  'oklch(0.58 0.11 28)',  'oklch(0.95 0.05 65)'],
  ['oklch(0.90 0.05 210)', 'oklch(0.48 0.07 235)', 'oklch(0.97 0.02 205)'],
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
  'lighthouse',
  'train',
  'library',
  'robot',
  'mountain',
  'circus',
  'planet',
  'campfire',
  'rainy-window',
  'compass',
  'snow-village',
  'music',
  'magic-door',
  'treehouse',
];

function pickVariant(seed: number) {
  const safeSeed = Math.abs(Math.trunc(seed));
  const template = TEMPLATES[safeSeed % TEMPLATES.length];
  const palette = PALETTES[(safeSeed * 7 + Math.floor(safeSeed / TEMPLATES.length)) % PALETTES.length];
  return { template, palette };
}

export function CoverArt({ seed, title }: Props) {
  const { template, palette } = pickVariant(seed);
  const style: CSSProperties = {
    ['--c1' as string]: palette[0],
    ['--c2' as string]: palette[1],
    ['--c3' as string]: palette[2],
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
      {template === 'lighthouse' ? <Lighthouse /> : null}
      {template === 'train' ? <Train /> : null}
      {template === 'library' ? <Library /> : null}
      {template === 'robot' ? <Robot /> : null}
      {template === 'mountain' ? <Mountain /> : null}
      {template === 'circus' ? <Circus /> : null}
      {template === 'planet' ? <Planet /> : null}
      {template === 'campfire' ? <Campfire /> : null}
      {template === 'rainy-window' ? <RainyWindow /> : null}
      {template === 'compass' ? <Compass /> : null}
      {template === 'snow-village' ? <SnowVillage /> : null}
      {template === 'music' ? <Music /> : null}
      {template === 'magic-door' ? <MagicDoor /> : null}
      {template === 'treehouse' ? <Treehouse /> : null}
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

/** 등대 — 주제: 바다/길찾기/용기. */
function Lighthouse() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <path d="M0,74 Q40,66 80,72 T160,70 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.35" />
      <path d="M0,84 Q40,78 80,84 T160,82 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.6" />
      <g transform="translate(76 28)">
        <path d="M-10,52 L-6,10 L6,10 L10,52 Z" fill="var(--c3)" />
        <path d="M-7,26 L7,22 L8,30 L-8,34 Z" fill="var(--c2)" opacity="0.75" />
        <path d="M-7,40 L7,36 L8,44 L-8,48 Z" fill="var(--c2)" opacity="0.75" />
        <rect x="-8" y="3" width="16" height="9" rx="2" fill="var(--c2)" />
        <path d="M-14,3 L0,-6 L14,3 Z" fill="var(--c2)" />
        <circle cx="0" cy="7.5" r="3" fill="oklch(0.96 0.08 100)" />
      </g>
      <path d="M78,36 L22,18 L24,34 Z" fill="var(--c3)" opacity="0.35" />
      <path d="M82,36 L140,18 L138,34 Z" fill="var(--c3)" opacity="0.35" />
      <path d="M18,40 Q22,36 26,40 Q30,36 34,40" stroke="var(--c2)" strokeWidth="1" fill="none" opacity="0.7" />
    </Svg>
  );
}

/** 기차 — 주제: 여행/도시/탐험. */
function Train() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <path d="M0,76 Q50,62 100,74 T160,68 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.3" />
      <g stroke="var(--c2)" strokeWidth="2" opacity="0.55">
        <line x1="18" y1="82" x2="142" y2="82" />
        <line x1="20" y1="88" x2="144" y2="88" />
      </g>
      <g transform="translate(40 48)">
        <rect x="0" y="12" width="58" height="22" rx="5" fill="var(--c2)" />
        <rect x="44" y="4" width="26" height="30" rx="4" fill="var(--c2)" />
        <rect x="7" y="18" width="10" height="8" rx="2" fill="var(--c3)" opacity="0.85" />
        <rect x="23" y="18" width="10" height="8" rx="2" fill="var(--c3)" opacity="0.85" />
        <rect x="51" y="12" width="11" height="10" rx="2" fill="var(--c3)" opacity="0.85" />
        <circle cx="14" cy="36" r="5" fill="oklch(0.30 0.04 250)" />
        <circle cx="50" cy="36" r="5" fill="oklch(0.30 0.04 250)" />
        <rect x="64" y="-4" width="7" height="8" fill="var(--c2)" />
      </g>
      <g fill="var(--c3)" opacity="0.45">
        <circle cx="116" cy="36" r="4" />
        <circle cx="124" cy="30" r="5" />
        <circle cx="134" cy="24" r="6" />
      </g>
    </Svg>
  );
}

/** 도서관 — 주제: 책/지식/조용한 발견. */
function Library() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <rect x="18" y="24" width="124" height="58" rx="6" fill="var(--c3)" opacity="0.8" />
      {[34, 58, 82, 106, 130].map((x) => (
        <line key={x} x1={x} y1="28" x2={x} y2="82" stroke="var(--c2)" strokeWidth="1.2" opacity="0.45" />
      ))}
      {[42, 60].map((y) => (
        <line key={y} x1="24" y1={y} x2="136" y2={y} stroke="var(--c2)" strokeWidth="1.8" opacity="0.55" />
      ))}
      {[
        [26, 31, 7, 18], [36, 33, 5, 16], [45, 29, 8, 20],
        [64, 45, 6, 15], [73, 44, 8, 16], [86, 46, 5, 14],
        [104, 31, 7, 18], [116, 29, 6, 20], [126, 34, 8, 15],
        [32, 63, 8, 16], [44, 65, 5, 14], [72, 62, 7, 17],
        [96, 64, 8, 15], [112, 62, 6, 17], [124, 64, 7, 15],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="1.5" fill={i % 3 === 0 ? 'var(--c2)' : 'var(--c1)'} opacity="0.85" />
      ))}
      <circle cx="80" cy="20" r="8" fill="var(--c2)" opacity="0.5" />
    </Svg>
  );
}

/** 로봇 — 주제: 과학/발명/친구. */
function Robot() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <g fill="var(--c2)" opacity="0.35">
        <circle cx="26" cy="22" r="3" />
        <circle cx="136" cy="30" r="4" />
        <circle cx="32" cy="72" r="2" />
      </g>
      <g transform="translate(80 52)">
        <rect x="-24" y="-20" width="48" height="40" rx="8" fill="var(--c2)" />
        <rect x="-16" y="-34" width="32" height="18" rx="6" fill="var(--c3)" />
        <line x1="0" y1="-34" x2="0" y2="-44" stroke="var(--c2)" strokeWidth="2" />
        <circle cx="0" cy="-46" r="3" fill="var(--c2)" />
        <circle cx="-9" cy="-25" r="3" fill="var(--c2)" />
        <circle cx="9" cy="-25" r="3" fill="var(--c2)" />
        <rect x="-12" y="-4" width="24" height="8" rx="4" fill="var(--c3)" opacity="0.9" />
        <line x1="-24" y1="-2" x2="-38" y2="-12" stroke="var(--c2)" strokeWidth="4" strokeLinecap="round" />
        <line x1="24" y1="-2" x2="38" y2="-12" stroke="var(--c2)" strokeWidth="4" strokeLinecap="round" />
        <line x1="-12" y1="20" x2="-18" y2="34" stroke="var(--c2)" strokeWidth="5" strokeLinecap="round" />
        <line x1="12" y1="20" x2="18" y2="34" stroke="var(--c2)" strokeWidth="5" strokeLinecap="round" />
      </g>
    </Svg>
  );
}

/** 산 — 주제: 도전/자연/여정. */
function Mountain() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <circle cx="124" cy="22" r="10" fill="var(--c3)" opacity="0.7" />
      <path d="M8,90 L54,28 L98,90 Z" fill="var(--c2)" opacity="0.55" />
      <path d="M48,90 L98,20 L154,90 Z" fill="var(--c2)" opacity="0.8" />
      <path d="M54,28 L42,48 L58,42 L66,55 L98,90 Z" fill="var(--c3)" opacity="0.75" />
      <path d="M98,20 L84,44 L102,38 L116,56 L154,90 Z" fill="var(--c3)" opacity="0.75" />
      <path d="M0,90 Q40,82 80,90 T160,88 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.4" />
      <path d="M26,24 Q30,20 34,24 Q38,20 42,24" stroke="var(--c2)" strokeWidth="1" fill="none" opacity="0.65" />
    </Svg>
  );
}

/** 서커스 텐트 — 주제: 공연/축제/놀라움. */
function Circus() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <path d="M0,82 Q80,70 160,82 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.28" />
      <g transform="translate(80 30)">
        <path d="M0,-18 L52,52 L-52,52 Z" fill="var(--c3)" />
        <path d="M0,-18 L18,52 L-18,52 Z" fill="var(--c2)" opacity="0.85" />
        <path d="M-30,52 L-18,14 L-4,52 Z" fill="var(--c2)" opacity="0.55" />
        <path d="M30,52 L18,14 L4,52 Z" fill="var(--c2)" opacity="0.55" />
        <path d="M-56,52 Q0,40 56,52 L56,60 L-56,60 Z" fill="var(--c2)" />
        <path d="M0,-18 L0,-32" stroke="var(--c2)" strokeWidth="1.5" />
        <path d="M0,-32 L12,-28 L0,-24 Z" fill="var(--c2)" />
      </g>
      <g fill="var(--c2)" opacity="0.75">
        {[26, 42, 118, 134].map((x, i) => (
          <path key={i} d={`M${x},22 l4,6 l-8,0 Z`} />
        ))}
      </g>
    </Svg>
  );
}

/** 행성 — 주제: 우주/상상/탐사. */
function Planet() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <g fill="var(--c3)" opacity="0.65">
        {[18, 36, 54, 118, 142].map((x, i) => (
          <circle key={i} cx={x} cy={18 + (i % 3) * 16} r={i % 2 ? 1.3 : 1.8} />
        ))}
      </g>
      <g transform="translate(80 54)">
        <ellipse cx="0" cy="0" rx="46" ry="11" fill="none" stroke="var(--c3)" strokeWidth="5" opacity="0.75" />
        <circle cx="0" cy="0" r="25" fill="var(--c2)" />
        <path d="M-18,-8 Q0,-18 18,-8 Q8,2 -18,-8 Z" fill="var(--c3)" opacity="0.35" />
        <path d="M-24,2 Q0,14 24,2 Q12,20 -16,18 Z" fill="var(--c3)" opacity="0.3" />
      </g>
      <path d="M120,76 L136,68 L132,84 Z" fill="var(--c2)" opacity="0.75" />
    </Svg>
  );
}

/** 캠프파이어 — 주제: 밤/친구/캠핑. */
function Campfire() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <g fill="var(--c3)">
        {[20, 42, 68, 112, 140].map((x, i) => (
          <circle key={i} cx={x} cy={18 + (i % 2) * 14} r="1.4" />
        ))}
      </g>
      <path d="M0,78 Q80,66 160,78 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.35" />
      <g transform="translate(50 52)">
        <path d="M0,32 L22,-8 L44,32 Z" fill="var(--c2)" opacity="0.8" />
        <path d="M8,32 L22,4 L36,32 Z" fill="var(--c3)" opacity="0.9" />
        <line x1="22" y1="-8" x2="22" y2="32" stroke="var(--c3)" strokeWidth="1" opacity="0.6" />
      </g>
      <g transform="translate(100 72)">
        <line x1="-18" y1="14" x2="18" y2="-2" stroke="oklch(0.38 0.08 50)" strokeWidth="4" strokeLinecap="round" />
        <line x1="-18" y1="-2" x2="18" y2="14" stroke="oklch(0.38 0.08 50)" strokeWidth="4" strokeLinecap="round" />
        <path d="M0,8 C-8,-2 -2,-10 2,-18 C4,-8 14,-2 4,10 Z" fill="oklch(0.78 0.16 55)" />
        <path d="M0,8 C-4,0 0,-5 2,-10 C4,-4 8,0 3,9 Z" fill="oklch(0.94 0.10 88)" />
      </g>
    </Svg>
  );
}

/** 비 오는 창문 — 주제: 집/기다림/상상. */
function RainyWindow() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <rect x="42" y="20" width="76" height="58" rx="6" fill="var(--c3)" opacity="0.85" />
      <rect x="50" y="28" width="28" height="18" rx="2" fill="var(--c2)" opacity="0.45" />
      <rect x="82" y="28" width="28" height="18" rx="2" fill="var(--c2)" opacity="0.45" />
      <rect x="50" y="50" width="28" height="20" rx="2" fill="var(--c2)" opacity="0.55" />
      <rect x="82" y="50" width="28" height="20" rx="2" fill="var(--c2)" opacity="0.55" />
      <line x1="80" y1="24" x2="80" y2="74" stroke="var(--c1)" strokeWidth="2" opacity="0.7" />
      <line x1="46" y1="48" x2="114" y2="48" stroke="var(--c1)" strokeWidth="2" opacity="0.7" />
      <g stroke="var(--c2)" strokeWidth="2" strokeLinecap="round" opacity="0.75">
        {[22, 36, 126, 140].map((x, i) => (
          <line key={i} x1={x} y1={24 + i * 8} x2={x - 4} y2={36 + i * 8} />
        ))}
      </g>
      <path d="M20,86 Q80,74 140,86" stroke="var(--c2)" strokeWidth="4" fill="none" opacity="0.35" />
    </Svg>
  );
}

/** 나침반 — 주제: 탐험/지도/선택. */
function Compass() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <path d="M18,18 Q48,10 78,18 T142,16 L136,82 Q104,92 78,82 T22,84 Z" fill="var(--c3)" opacity="0.75" />
      <g stroke="var(--c2)" strokeWidth="1" fill="none" opacity="0.4">
        <path d="M32,28 Q58,38 82,30 T128,32" />
        <path d="M28,60 Q60,52 84,64 T132,58" />
        <path d="M54,18 Q48,44 58,82" />
        <path d="M104,16 Q112,46 100,82" />
      </g>
      <g transform="translate(82 52)">
        <circle cx="0" cy="0" r="22" fill="var(--c1)" opacity="0.7" />
        <circle cx="0" cy="0" r="18" fill="none" stroke="var(--c2)" strokeWidth="2" />
        <path d="M0,-16 L7,0 L0,16 L-7,0 Z" fill="var(--c2)" />
        <path d="M0,-10 L4,0 L0,10 Z" fill="var(--c3)" opacity="0.9" />
      </g>
      <path d="M30,74 L38,68 L42,78 Z" fill="var(--c2)" opacity="0.7" />
    </Svg>
  );
}

/** 눈 마을 — 주제: 겨울/가족/따뜻함. */
function SnowVillage() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <g fill="var(--c3)" opacity="0.85">
        {[22, 44, 72, 118, 138].map((x, i) => (
          <circle key={i} cx={x} cy={18 + (i % 3) * 10} r="1.8" />
        ))}
      </g>
      <path d="M0,76 Q40,68 80,76 T160,74 L160,100 L0,100 Z" fill="var(--c3)" opacity="0.9" />
      {[
        [32, 58, 22, 18],
        [68, 52, 26, 24],
        [112, 60, 20, 16],
      ].map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} rx="2" fill="var(--c2)" />
          <path d={`M${x - 4},${y} L${x + w / 2},${y - 14} L${x + w + 4},${y} Z`} fill="oklch(0.46 0.08 28)" opacity="0.85" />
          <rect x={x + w * 0.58} y={y + 7} width="5" height="8" fill="var(--c3)" opacity="0.85" />
        </g>
      ))}
      <path d="M18,84 Q80,76 142,84" stroke="var(--c2)" strokeWidth="2" fill="none" opacity="0.25" />
    </Svg>
  );
}

/** 음악 — 주제: 노래/리듬/무대. */
function Music() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <circle cx="80" cy="50" r="34" fill="var(--c3)" opacity="0.35" />
      <g fill="var(--c2)">
        <path d="M62,28 L90,22 L90,64 L84,64 L84,34 L68,37 L68,70 L62,70 Z" />
        <ellipse cx="58" cy="72" rx="9" ry="6" transform="rotate(-18 58 72)" />
        <ellipse cx="86" cy="66" rx="9" ry="6" transform="rotate(-18 86 66)" />
      </g>
      <g stroke="var(--c2)" strokeWidth="1.4" fill="none" opacity="0.45">
        <path d="M24,34 Q38,24 52,34" />
        <path d="M108,36 Q126,24 142,36" />
        <path d="M24,76 Q42,64 56,76" />
      </g>
      <g fill="var(--c3)" opacity="0.8">
        <circle cx="122" cy="70" r="3" />
        <path d="M126,70 L126,52" stroke="var(--c3)" strokeWidth="2" />
      </g>
    </Svg>
  );
}

/** 마법 문 — 주제: 판타지/선택/새 세계. */
function MagicDoor() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <g fill="var(--c3)" opacity="0.75">
        {[24, 42, 120, 138].map((x, i) => (
          <path key={i} d={`M${x},${24 + i * 8} l3,5 l-6,0 Z`} />
        ))}
      </g>
      <path d="M0,84 Q80,72 160,84 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.25" />
      <g transform="translate(80 52)">
        <path d="M-24,34 L-24,-14 Q-24,-34 0,-34 Q24,-34 24,-14 L24,34 Z" fill="var(--c2)" />
        <path d="M-16,34 L-16,-10 Q-16,-24 0,-24 Q16,-24 16,-10 L16,34 Z" fill="var(--c3)" opacity="0.85" />
        <circle cx="10" cy="8" r="2.5" fill="var(--c2)" />
        <path d="M-32,36 L32,36" stroke="var(--c2)" strokeWidth="5" strokeLinecap="round" />
      </g>
      <circle cx="80" cy="52" r="42" fill="none" stroke="var(--c3)" strokeWidth="2" opacity="0.25" />
    </Svg>
  );
}

/** 나무집 — 주제: 숲/친구/비밀 아지트. */
function Treehouse() {
  return (
    <Svg>
      <rect width="160" height="100" fill="var(--c1)" />
      <path d="M0,82 Q80,70 160,82 L160,100 L0,100 Z" fill="var(--c2)" opacity="0.3" />
      <g transform="translate(80 52)">
        <rect x="-5" y="10" width="10" height="36" rx="3" fill="oklch(0.38 0.08 45)" />
        <circle cx="-22" cy="-4" r="24" fill="var(--c2)" opacity="0.65" />
        <circle cx="18" cy="-8" r="26" fill="var(--c2)" opacity="0.75" />
        <circle cx="0" cy="-20" r="24" fill="var(--c2)" opacity="0.85" />
        <rect x="-24" y="-4" width="48" height="26" rx="4" fill="var(--c3)" />
        <path d="M-28,-4 L0,-24 L28,-4 Z" fill="var(--c2)" />
        <rect x="-8" y="8" width="10" height="14" fill="var(--c2)" opacity="0.75" />
        <rect x="8" y="4" width="8" height="8" rx="1.5" fill="var(--c1)" opacity="0.8" />
        <g stroke="oklch(0.38 0.08 45)" strokeWidth="2">
          <line x1="-22" y1="24" x2="-30" y2="46" />
          <line x1="-14" y1="24" x2="-22" y2="46" />
          <line x1="-27" y1="34" x2="-18" y2="34" />
          <line x1="-30" y1="42" x2="-21" y2="42" />
        </g>
      </g>
      <path d="M28,30 Q32,26 36,30 Q40,26 44,30" stroke="var(--c2)" strokeWidth="1" fill="none" opacity="0.7" />
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
