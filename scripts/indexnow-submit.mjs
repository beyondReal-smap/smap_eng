#!/usr/bin/env node
/**
 * IndexNow로 공개 URL을 검색엔진에 즉시 제출한다.
 *
 * ── 왜 IndexNow인가
 * Google Search Console·네이버 서치어드바이저는 계정 소유자만 제출할 수 있어
 * 자동화가 불가능하다. IndexNow는 사이트에 키 파일을 호스팅하는 것으로 소유권을
 * 증명하므로 계정 없이 제출된다. 하나의 엔드포인트에 보내면 참여 검색엔진
 * (Bing, Yandex, Seznam, Naver 등)에 함께 전달된다.
 * ⚠️ Google은 IndexNow 미참여 — Search Console 제출이 별도로 필요하다.
 *
 * ── 키 파일
 * `public/<key>.txt`에 키 문자열만 담아 두면 `https://eng.smap.site/<key>.txt`로
 * 서빙된다. 이 스크립트는 public/에서 그 파일을 자동으로 찾는다.
 * ⚠️ public/에 파일을 새로 넣었다면 반드시 `bash scripts/deploy.sh`로 재빌드해야
 *    서빙된다 — Next.js가 빌드 시점에 public 목록을 스냅샷으로 고정하기 때문에
 *    파일만 두고 제출하면 검색엔진의 키 검증이 404로 실패한다.
 *
 * ── 사용
 *   node scripts/indexnow-submit.mjs            # sitemap.xml의 전체 URL 제출
 *   node scripts/indexnow-submit.mjs /faq /pricing   # 특정 경로만 제출
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'eng.smap.site';
const ORIGIN = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** public/에서 IndexNow 키 파일(32~128자 16진수 이름)을 찾는다. */
function findKey() {
  const match = readdirSync(join(ROOT, 'public')).find((name) =>
    /^[a-f0-9]{32,128}\.txt$/.test(name),
  );
  if (!match) {
    throw new Error(
      'public/ 에서 IndexNow 키 파일을 찾지 못했습니다. ' +
        '`openssl rand -hex 16` 으로 키를 만들어 public/<key>.txt 에 저장하세요.',
    );
  }

  const key = match.replace(/\.txt$/, '');
  const body = readFileSync(join(ROOT, 'public', match), 'utf8').trim();
  // 파일 이름과 내용이 다르면 검색엔진의 키 검증이 실패한다 — 제출 전에 잡는다.
  if (body !== key) {
    throw new Error(`키 파일 내용이 파일명과 다릅니다: ${match} (내용: "${body}")`);
  }
  return key;
}

/** 운영 sitemap.xml에서 URL 목록을 읽는다. 로컬 소스가 아닌 실제 서빙 결과가 기준. */
async function urlsFromSitemap() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml 조회 실패: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

/** 제출 전 키 파일이 실제로 서빙되는지 확인 — 재빌드를 잊은 경우를 조기에 잡는다. */
async function assertKeyIsServed(key) {
  const res = await fetch(`${ORIGIN}/${key}.txt`);
  if (!res.ok) {
    throw new Error(
      `키 파일이 서빙되지 않습니다 (${ORIGIN}/${key}.txt → HTTP ${res.status}). ` +
        'public/ 에 파일을 추가한 뒤 `bash scripts/deploy.sh`로 재빌드했는지 확인하세요.',
    );
  }
  const served = (await res.text()).trim();
  if (served !== key) {
    throw new Error(`서빙되는 키 내용이 다릅니다: "${served}" (기대: "${key}")`);
  }
}

const args = process.argv.slice(2);
const key = findKey();
const urlList = args.length
  ? args.map((path) => new URL(path, ORIGIN).toString())
  : await urlsFromSitemap();

console.log(`[indexnow] key=${key}`);
await assertKeyIsServed(key);
console.log(`[indexnow] 키 파일 검증 OK`);
console.log(`[indexnow] 제출 대상 ${urlList.length}건`);
urlList.forEach((url) => console.log(`  - ${url}`));

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `${ORIGIN}/${key}.txt`, urlList }),
});

const text = await res.text();
console.log(`[indexnow] HTTP ${res.status} ${res.statusText}`);
if (text) console.log(`[indexnow] 응답: ${text}`);

// IndexNow 규격: 200/202 = 수락. 그 외는 실패로 보고 종료 코드를 남긴다
// (성공을 가장하면 색인이 안 되고 있어도 알 수 없다).
if (res.status !== 200 && res.status !== 202) {
  console.error('[indexnow] 제출 실패 — 위 응답을 확인하세요.');
  process.exit(1);
}
console.log('[indexnow] 제출 완료');
