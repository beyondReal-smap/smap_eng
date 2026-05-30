import type { CSSProperties } from 'react';
import {
  Balloon,
  Campfire,
  Castle,
  Circus,
  Compass,
  Creature,
  ForestPath,
  Garden,
  Kite,
  Landscape,
  Library,
  Lighthouse,
  MagicDoor,
  Mountain,
  Music,
  NightSky,
  Planet,
  RainyWindow,
  Robot,
  SnowVillage,
  Train,
  Treehouse,
  Underwater,
  Vehicle,
} from './cover-art/illustrations';

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
