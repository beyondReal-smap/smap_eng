// 통계 "독서 기록" 순수 함수 — 달력 배치·도장 각도·레벨 집계·지금 여기.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { BookProgressStat } from '@/lib/db/queries';
import type { Book, CefrLevel } from '@/lib/db/schema';
import { currentLevel, levelRows, monthLayout, stampTilt } from './records';

function book(id: number, cefr: CefrLevel): Book {
  return { id, cefr } as Book;
}

function stat(startedAtUnix: number, finished = false): BookProgressStat {
  return { progressRatio: finished ? 1 : 0.5, quizScore: null, finishedAtUnix: finished ? startedAtUnix + 60 : null, startedAtUnix };
}

describe('monthLayout', () => {
  test('2026년 9월은 화요일 시작 — 빈칸 2개 + 30일', () => {
    const m = monthLayout('2026-09');
    assert.equal(m.daysInMonth, 30);
    assert.equal(m.cells.filter((c) => c.kind === 'blank').length, 2);
    const first = m.cells[2];
    assert.equal(first.kind === 'day' && first.key, '2026-09-01');
  });

  test('윤년 2월, 형식이 틀리면 지금 달', () => {
    assert.equal(monthLayout('2028-02').daysInMonth, 29);
    const m = monthLayout('bad', new Date(2026, 0, 15));
    assert.equal(m.year, 2026);
    assert.equal(m.month, 1);
  });

  test('칸 id가 겹치지 않는다', () => {
    const ids = monthLayout('2026-08').cells.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe('stampTilt', () => {
  test('−14~14° 범위에서 날짜마다 결정적(iOS와 같은 식)', () => {
    for (let d = 1; d <= 31; d += 1) {
      const t = stampTilt(d);
      assert.ok(t >= -14 && t <= 14);
      assert.equal(t, stampTilt(d));
    }
    assert.equal(stampTilt(1), -6);
  });
});

describe('levelRows / currentLevel', () => {
  const books = [book(1, 'A1'), book(2, 'A2'), book(3, 'A2'), book(4, 'B2')];

  test('레벨별 책 수와 완독 수', () => {
    const rows = levelRows(books, { 2: stat(100, true), 3: stat(200) });
    assert.deepEqual(
      rows.map((r) => [r.level, r.count, r.finished]),
      [['A1', 1, 0], ['A2', 2, 1], ['B1', 0, 0], ['B2', 1, 0]],
    );
  });

  test('지금 여기 = 가장 최근에 시작한 책의 레벨', () => {
    assert.equal(currentLevel(books, { 1: stat(300), 4: stat(200) }), 'A1');
    assert.equal(currentLevel(books, { 1: stat(100), 4: stat(500) }), 'B2');
  });

  test('읽은 기록이 없으면 책이 있는 가장 낮은 레벨, 책이 없으면 null', () => {
    assert.equal(currentLevel([book(9, 'B1'), book(8, 'A2')], {}), 'A2');
    assert.equal(currentLevel([], {}), null);
  });
});
