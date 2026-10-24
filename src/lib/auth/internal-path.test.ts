// callbackUrl 내부 경로 판정 — open redirect 우회 패턴 회귀 방지.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { toInternalPath } from './internal-path';

describe('toInternalPath', () => {
  test('내부 경로는 path+search+hash 그대로', () => {
    assert.equal(toInternalPath('/stats'), '/stats');
    assert.equal(toInternalPath('/book/1?tab=quiz#top'), '/book/1?tab=quiz#top');
    assert.equal(toInternalPath('/'), '/');
  });

  test('값이 없거나 `/`로 시작하지 않으면 null', () => {
    assert.equal(toInternalPath(null), null);
    assert.equal(toInternalPath(''), null);
    assert.equal(toInternalPath('stats'), null);
    assert.equal(toInternalPath('https://evil.example/'), null);
    assert.equal(toInternalPath('https://eng.smap.site/stats'), null);
    assert.equal(toInternalPath('javascript:alert(1)'), null);
  });

  test('protocol-relative·백슬래시 우회는 null', () => {
    assert.equal(toInternalPath('//evil.example'), null);
    assert.equal(toInternalPath('/\\evil.example'), null);
    assert.equal(toInternalPath('/\\/evil.example'), null);
  });

  test('URL 파서가 지우는 탭·개행 우회(`/%09/evil.example` 디코딩 결과)는 null', () => {
    for (const ws of ['\t', '\n', '\r']) {
      assert.equal(toInternalPath(`/${ws}/evil.example`), null, JSON.stringify(ws));
    }
  });

  test('점 세그먼트로 만든 `//` 경로는 단일 슬래시로 축약', () => {
    assert.equal(toInternalPath('/.//evil.example'), '/evil.example');
    assert.equal(toInternalPath('/a/..//evil.example'), '/evil.example');
  });
});
