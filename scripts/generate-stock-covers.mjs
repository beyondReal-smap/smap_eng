#!/usr/bin/env node
// Stock 표지 50장 생성 — OpenAI gpt-image-1 호출.
// public/images/covers/{categoryId}-{n}.png 형식으로 저장한다.
//
// 사용법:
//   node --env-file=.env.local scripts/generate-stock-covers.mjs --dry-run
//     → animals-1.png 1장만 생성(검증용, ~$0.04)
//   node --env-file=.env.local scripts/generate-stock-covers.mjs
//     → 누락된 모든 표지 생성(~$2.10, 이미 존재하는 파일은 skip)
//   node --env-file=.env.local scripts/generate-stock-covers.mjs --force
//     → 기존 파일도 덮어쓰기
//   node --env-file=.env.local scripts/generate-stock-covers.mjs --only animals
//     → 특정 카테고리만 생성

import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const OUTPUT_DIR = resolve(REPO_ROOT, 'public/images/covers');

// pickStockCover 풀과 동일한 카테고리/개수 (src/lib/image/stock-covers.ts와 일치)
const COVERS_PER_CATEGORY = {
  animals: 7,
  adventure: 6,
  fantasy: 7,
  daily: 6,
  nature: 6,
  jobs: 6,
  food: 6,
  family: 6,
};

// 카테고리별 다양한 시각 모티프 — 같은 풀 안에서 그림이 겹치지 않도록 의도적으로 다른 장면을 골랐다.
// 각 배열 길이는 COVERS_PER_CATEGORY 값과 정확히 일치해야 한다.
const COVER_PROMPTS = {
  animals: [
    'A cute fox and a bunny becoming friends in a sunny forest meadow',
    'A friendly bear cub holding a honey jar, surrounded by butterflies',
    'A family of penguins waddling on a snowy iceberg under a soft sky',
    'A curious orange kitten peeking out of a flower basket',
    'A wise owl perched on a branch under a starry twilight sky',
    'A playful elephant calf splashing in a shallow blue pond',
    'A squirrel hugging an acorn in a cozy autumn tree hollow',
  ],
  adventure: [
    'A brave child explorer with a backpack walking into a magical jungle path',
    'A small wooden sailboat sailing across calm turquoise ocean waves',
    'A child looking up at a starry sky from a grassy hilltop with a telescope',
    'A treasure map and an old compass on a sandy desert dune at sunset',
    'A child riding in a colorful hot air balloon over rolling green hills',
    'A child holding a glowing lantern at the entrance of a friendly cave',
  ],
  fantasy: [
    'A young wizard in a pointy hat with a tiny dragon friend in a castle garden',
    'A unicorn standing on a rainbow bridge above pink clouds',
    'A friendly mermaid in a coral reef surrounded by glowing fish',
    'A fairy with sparkling wings dancing among giant glowing mushrooms',
    'A magical floating castle in the clouds at golden sunrise',
    'A gentle dragon sleeping next to a sleeping child under a starry sky',
    'A magic book glowing with stars opening in an enchanted forest',
  ],
  daily: [
    'Two best friends laughing on a school playground with autumn leaves',
    'Children flying colorful kites together in a wide green park',
    'A child and a friend sharing snacks in a cozy bedroom blanket fort',
    'A small group of children planting a young tree in a sunny garden',
    'A child writing in a journal at a window with morning sunlight',
    'Children walking to school together holding umbrellas in light rain',
  ],
  nature: [
    'A cherry blossom tree in full bloom with petals floating in spring breeze',
    'A peaceful lake in a forest reflecting tall pine trees and a soft sky',
    'A field of sunflowers turning toward the warm summer sun',
    'A snowy winter forest with gentle deer and sparkling snowflakes',
    'A vibrant rainbow arching over a green hillside after rain',
    'A starry night sky over a calm ocean with bioluminescent waves',
  ],
  jobs: [
    'A smiling child dressed as a doctor with a stethoscope and a teddy bear patient',
    'A child firefighter holding a small hose next to a friendly fire truck',
    'A child chef in a tall hat baking colorful cupcakes in a bright kitchen',
    'A child astronaut floating in a friendly cartoon space station',
    'A child teacher pointing at a chalkboard with cheerful drawings',
    'A child farmer with a basket of fresh vegetables in a sunny field',
  ],
  food: [
    'A giant stack of fluffy pancakes with butter and berries on a plate',
    'A whimsical bakery shelf full of colorful cookies, cakes and breads',
    'A cute lunchbox open showing rice, vegetables, and a smiling sandwich',
    'A child holding a tall ice cream cone with rainbow scoops',
    'A warm bowl of noodles with steam rising in a cozy kitchen',
    'A fruit basket overflowing with apples, oranges and grapes on a wooden table',
  ],
  family: [
    'A loving family reading a storybook together on a soft couch',
    'A child holding hands with grandma walking through a sunny park',
    'A whole family having a picnic on a checkered blanket under a tree',
    'Siblings building a sandcastle together at a friendly beach',
    'A parent tucking a child into bed under a starry mobile',
    'A family cooking dinner together in a warm kitchen, all smiling',
  ],
};

const STYLE_SUFFIX =
  ", children's storybook cover illustration, soft pastel colors, warm lighting, " +
  'cute friendly characters, hand-drawn watercolor style, whimsical, cozy atmosphere, ' +
  'safe for kids, no text, no letters, no logos, centered composition';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const onlyIdx = args.indexOf('--only');
const onlyCategory = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

if (!process.env.OPENAI_API_KEY) {
  console.error('[fatal] OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
  console.error('  실행 예: node --env-file=.env.local scripts/generate-stock-covers.mjs --dry-run');
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function buildPlan() {
  const plan = [];
  for (const [cat, count] of Object.entries(COVERS_PER_CATEGORY)) {
    if (onlyCategory && cat !== onlyCategory) continue;
    const prompts = COVER_PROMPTS[cat];
    if (!prompts || prompts.length !== count) {
      throw new Error(
        `[config] ${cat} 카테고리 프롬프트 수(${prompts?.length ?? 0})가 풀 크기(${count})와 일치하지 않습니다.`,
      );
    }
    for (let i = 0; i < count; i += 1) {
      plan.push({
        category: cat,
        index: i + 1,
        prompt: `${prompts[i]}${STYLE_SUFFIX}`,
        outputPath: resolve(OUTPUT_DIR, `${cat}-${i + 1}.png`),
      });
    }
  }
  return plan;
}

async function generateOne({ category, index, prompt, outputPath }) {
  const t0 = Date.now();
  // dall-e-3: 모바일 카드 UI 컷오프 최소화 위해 정사각 1024×1024.
  // standard 품질($0.04)이 hd($0.08) 대비 동화책 표지 용도엔 충분.
  // gpt-image-1은 OpenAI 조직 검증 필요(현 프로젝트 미통과)이라 dall-e-3 사용.
  const res = await client.images.generate({
    model: 'dall-e-3',
    prompt,
    size: '1024x1024',
    quality: 'standard',
    response_format: 'b64_json',
    n: 1,
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI 응답에 b64_json이 없습니다.');
  }
  const buf = Buffer.from(b64, 'base64');
  await writeFile(outputPath, buf);
  const ms = Date.now() - t0;
  console.log(
    `  ✓ ${category}-${index}.png (${(buf.length / 1024).toFixed(0)}KB, ${(ms / 1000).toFixed(1)}s)`,
  );
}

async function generateWithRetry(item, retries = 1) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await generateOne(item);
      return;
    } catch (err) {
      lastErr = err;
      const isRateLimit = err?.status === 429;
      const isTransient = err?.status >= 500 || err?.code === 'ECONNRESET';
      if (attempt < retries && (isRateLimit || isTransient)) {
        const wait = isRateLimit ? 30_000 : 5_000;
        console.warn(
          `  ! ${item.category}-${item.index} 실패(${err.status ?? err.code ?? '?'}), ${wait / 1000}s 후 재시도`,
        );
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw lastErr;
    }
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const fullPlan = buildPlan();
  let plan = fullPlan;

  if (isDryRun) {
    plan = fullPlan.slice(0, 1); // animals-1.png 1장
    console.log(
      `[dry-run] ${plan.length}장만 생성합니다 (예상 비용 ~$0.04).`,
    );
  } else if (!isForce) {
    const filtered = [];
    for (const item of fullPlan) {
      if (await fileExists(item.outputPath)) continue;
      filtered.push(item);
    }
    plan = filtered;
    console.log(
      `[run] 누락된 ${plan.length}/${fullPlan.length}장 생성합니다 (예상 비용 ~$${(plan.length * 0.042).toFixed(2)}).`,
    );
    if (plan.length === 0) {
      console.log('  → 모든 파일이 이미 존재합니다. --force 플래그로 덮어쓰기 가능.');
      return;
    }
  } else {
    console.log(
      `[force] 전체 ${plan.length}장 덮어쓰기 (예상 비용 ~$${(plan.length * 0.042).toFixed(2)}).`,
    );
  }

  let ok = 0;
  let fail = 0;
  for (const item of plan) {
    try {
      await generateWithRetry(item);
      ok += 1;
    } catch (err) {
      fail += 1;
      console.error(
        `  ✗ ${item.category}-${item.index} 최종 실패: ${err?.message ?? err}`,
      );
    }
    // OpenAI 이미지 RPM 한도 회피 — 시퀀셜 호출 사이에 짧은 간격.
    if (plan.length > 1) await new Promise((r) => setTimeout(r, 3000));
  }

  console.log(`\n결과: 성공 ${ok}, 실패 ${fail}`);
  console.log(`저장 위치: ${OUTPUT_DIR}`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
