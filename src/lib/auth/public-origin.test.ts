// 공개 origin 허용 목록 — 두 도메인 병행 서빙과 x-forwarded-host 스푸핑 방어.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { matchPublicOrigin, matchSignInOrigin, parsePublicOrigins } from './public-origin';

const ALLOWED = parsePublicOrigins('https://eng.smap.site, https://eng.aiagnt.kr');

function headersOf(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe('parsePublicOrigins', () => {
  test('host(소문자) → origin 맵', () => {
    assert.deepEqual(
      [...ALLOWED.entries()],
      [
        ['eng.smap.site', 'https://eng.smap.site'],
        ['eng.aiagnt.kr', 'https://eng.aiagnt.kr'],
      ],
    );
  });

  test('로컬 개발용 http origin과 포트를 그대로 유지', () => {
    assert.equal(
      parsePublicOrigins('http://localhost:3000').get('localhost:3000'),
      'http://localhost:3000',
    );
  });

  test('비어 있으면 빈 맵', () => {
    assert.equal(parsePublicOrigins(undefined).size, 0);
    assert.equal(parsePublicOrigins(' , ').size, 0);
  });

  test('경로·쿼리·계정 정보가 붙은 항목, http(s) 외 스킴, URL이 아닌 값은 거부', () => {
    assert.throws(() => parsePublicOrigins('https://eng.smap.site/login'));
    assert.throws(() => parsePublicOrigins('https://eng.smap.site?x=1'));
    assert.throws(() => parsePublicOrigins('https://user@eng.smap.site'));
    assert.throws(() => parsePublicOrigins('file:///'));
    assert.throws(() => parsePublicOrigins('ftp://eng.smap.site'));
    assert.throws(() => parsePublicOrigins('eng.smap.site'));
  });
});

describe('matchPublicOrigin', () => {
  test('두 도메인 모두 자기 origin으로 복원', () => {
    assert.equal(
      matchPublicOrigin(headersOf({ host: 'eng.smap.site' }), ALLOWED),
      'https://eng.smap.site',
    );
    assert.equal(
      matchPublicOrigin(headersOf({ host: 'eng.aiagnt.kr' }), ALLOWED),
      'https://eng.aiagnt.kr',
    );
  });

  test('x-forwarded-host가 host보다 우선 — @auth/core와 같은 순서', () => {
    assert.equal(
      matchPublicOrigin(
        headersOf({ host: 'localhost:5111', 'x-forwarded-host': 'eng.aiagnt.kr' }),
        ALLOWED,
      ),
      'https://eng.aiagnt.kr',
    );
  });

  test('허용 목록 밖의 x-forwarded-host는 host가 맞아도 거부', () => {
    assert.equal(
      matchPublicOrigin(
        headersOf({ host: 'eng.aiagnt.kr', 'x-forwarded-host': 'example.invalid' }),
        ALLOWED,
      ),
      null,
    );
  });

  test('내부 origin(localhost:5111)과 헤더 누락은 거부', () => {
    assert.equal(matchPublicOrigin(headersOf({ host: 'localhost:5111' }), ALLOWED), null);
    assert.equal(matchPublicOrigin(headersOf({}), ALLOWED), null);
  });

  test('대소문자 무시', () => {
    assert.equal(
      matchPublicOrigin(headersOf({ host: 'ENG.AIAGNT.KR' }), ALLOWED),
      'https://eng.aiagnt.kr',
    );
  });

  test('여러 값은 첫 값이 허용 호스트여도 거부 — createActionURL이 통째로 host로 쓰기 때문', () => {
    for (const xfh of [
      'example.invalid, eng.smap.site',
      'eng.smap.site, example.invalid',
      'eng.smap.site,example.invalid',
    ]) {
      assert.equal(matchPublicOrigin(headersOf({ 'x-forwarded-host': xfh }), ALLOWED), null, xfh);
    }
  });

  test('포트가 붙은 호스트는 별개로 취급', () => {
    assert.equal(matchPublicOrigin(headersOf({ host: 'eng.smap.site:8443' }), ALLOWED), null);
  });

  test('x-forwarded-proto는 보지 않음 — http 방문자도 https origin으로 리다이렉트', () => {
    assert.equal(
      matchPublicOrigin(headersOf({ host: 'eng.smap.site', 'x-forwarded-proto': 'http' }), ALLOWED),
      'https://eng.smap.site',
    );
  });
});

describe('matchSignInOrigin', () => {
  test('x-forwarded-proto가 origin 스킴과 같거나 없으면(createActionURL 기본 https) 통과', () => {
    assert.equal(
      matchSignInOrigin(headersOf({ host: 'eng.aiagnt.kr', 'x-forwarded-proto': 'https' }), ALLOWED),
      'https://eng.aiagnt.kr',
    );
    assert.equal(matchSignInOrigin(headersOf({ host: 'eng.aiagnt.kr' }), ALLOWED), 'https://eng.aiagnt.kr');
  });

  test('스킴이 다르거나 여러 값이면 거부 — redirect_uri가 http:// 등으로 어긋나는 것을 차단', () => {
    for (const xfp of ['http', 'https, http', 'https:']) {
      assert.equal(
        matchSignInOrigin(headersOf({ host: 'eng.aiagnt.kr', 'x-forwarded-proto': xfp }), ALLOWED),
        null,
        xfp,
      );
    }
  });

  test('로컬 http origin은 x-forwarded-proto: http일 때만 통과', () => {
    const local = parsePublicOrigins('http://localhost:3000');
    assert.equal(
      matchSignInOrigin(headersOf({ host: 'localhost:3000', 'x-forwarded-proto': 'http' }), local),
      'http://localhost:3000',
    );
    assert.equal(matchSignInOrigin(headersOf({ host: 'localhost:3000' }), local), null);
  });

  test('호스트 검사는 matchPublicOrigin과 동일', () => {
    assert.equal(
      matchSignInOrigin(headersOf({ host: 'eng.smap.site', 'x-forwarded-host': 'example.invalid' }), ALLOWED),
      null,
    );
  });
});
