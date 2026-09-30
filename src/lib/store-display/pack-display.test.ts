// 별 충전 화면 표시 함수 — 배지·기본 선택·기간 문구.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { StarPackage } from '@/lib/billing/packages';
import { defaultPackId, packBadges, packPeriodCopy } from './pack-display';

function pack(id: StarPackage['id'], perStarKrw: number, highlighted = false): StarPackage {
  return { id, stars: 1, priceKrw: perStarKrw, perStarKrw, name: '', tagline: '', features: [], cta: '', highlighted };
}

describe('pack-display', () => {
  const packs = [pack('small', 1100), pack('medium', 92, true), pack('large', 85)];

  test('가장 인기 = highlighted, 가장 알뜰 = 1개당 가격 최저', () => {
    assert.deepEqual(packBadges(packs), { medium: 'popular', large: 'value' });
  });

  test('인기 상품이 가장 알뜰하기도 하면 인기 배지만', () => {
    assert.deepEqual(packBadges([pack('small', 1100), pack('medium', 80, true)]), { medium: 'popular' });
  });

  test('기본 선택 = 인기 상품, 없으면 첫 상품, 비면 null', () => {
    assert.equal(defaultPackId(packs), 'medium');
    assert.equal(defaultPackId([pack('small', 1100), pack('large', 85)]), 'small');
    assert.equal(defaultPackId([]), null);
  });

  test('기간 문구는 상품 id별, 모르는 id는 null', () => {
    assert.equal(packPeriodCopy('small'), '한 권 먼저 만들어 보기');
    assert.equal(packPeriodCopy('medium'), '매일 한 권씩 두 달');
    assert.equal(packPeriodCopy('large'), '매일 한 권씩 넉 달 넘게');
    assert.equal(packPeriodCopy('huge'), null);
  });
});
