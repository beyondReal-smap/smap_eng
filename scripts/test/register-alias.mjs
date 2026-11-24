// node --test 전용 모듈 해석 훅 — 테스트 러너 의존성 없이 Node 내장 러너(node:test)로
// src/**/*.test.ts를 돌리기 위해 tsconfig의 `@/*` 별칭과 확장자 없는 상대 경로를 .ts 파일로 이어 준다.
// (Node 23.6+ 는 .ts 타입 제거를 기본 지원한다.) 사용: `pnpm test`
import { existsSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC_DIR = fileURLToPath(new URL('../../src/', import.meta.url));
const CANDIDATE_SUFFIXES = ['', '.ts', '.tsx', '/index.ts'];

function toTsFile(target) {
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = target + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = null;
    if (specifier.startsWith('@/')) {
      target = path.join(SRC_DIR, specifier.slice(2));
    } else if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL?.startsWith('file:') &&
      path.extname(specifier) === ''
    ) {
      target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (target) {
      const file = toTsFile(target);
      if (file) return nextResolve(pathToFileURL(file).href, context);
    }
    return nextResolve(specifier, context);
  },
});
