// 새 동화 만들기(14차) — iOS `HaruBookTests/CreateBookGuideTests.swift`와 같은 입력·기대값.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { BookProgressStat } from '@/lib/db/queries';
import type { CefrLevel } from '@/lib/db/schema';
import { familiar, subject, vocative } from '@/lib/korean-particle';
import {
  dative,
  genreSubtitle,
  instrumental,
  latestCreatedLevel,
  levelSubtitle,
  previewSentence,
  recentReadLevel,
  recommendationBadge,
  recommendedLevel,
  topicParticle,
} from './guide';

const BASE = 1_800_000_000_000;
function book(id: number, cefr: CefrLevel, createdDaysAgo: number | null) {
  return { id, cefr, createdAt: createdDaysAgo === null ? null : new Date(BASE - createdDaysAgo * 86_400_000) };
}
function stat(startedAtUnix: number): BookProgressStat {
  return { progressRatio: 0.5, quizScore: null, finishedAtUnix: null, startedAtUnix };
}

describe('CreateBookGuide — 조사', () => {
  test('받침에 따라 친근형 "이"를 먼저 붙인다', () => {
    assert.equal(vocative('지우'), '지우야');
    assert.equal(vocative('하준'), '하준아');
    assert.equal(subject('지우'), '지우가');
    assert.equal(subject('하준'), '하준이가');
    assert.equal(topicParticle('지우'), '지우는');
    assert.equal(topicParticle('하준'), '하준이는');
    assert.equal(dative('지우'), '지우에게');
    assert.equal(dative('하준'), '하준이에게');
    assert.equal(familiar('하준'), '하준이');
  });

  test('한글이 아닌 이름은 받침 없음으로', () => {
    assert.equal(vocative('Amy'), 'Amy야');
    assert.equal(subject('Amy'), 'Amy가');
    assert.equal(subject(''), '가');
  });

  test('도구격 로/으로', () => {
    assert.equal(instrumental('용기'), '로');
    assert.equal(instrumental('서울'), '로');
    assert.equal(instrumental('숲속'), '으로');
    assert.equal(instrumental('robot'), '로');
  });
});

describe('CreateBookGuide — 레벨 추천', () => {
  test('최근 레벨이 있으면 그것', () => {
    assert.equal(recommendedLevel('B2', 5), 'B2');
  });

  test('없으면 나이로', () => {
    assert.equal(recommendedLevel(null, 5), 'A1');
    assert.equal(recommendedLevel(null, 6), 'A1');
    assert.equal(recommendedLevel(null, 7), 'A2');
    assert.equal(recommendedLevel(null, 8), 'A2');
    assert.equal(recommendedLevel(null, 9), 'B1');
    assert.equal(recommendedLevel(null, 10), 'B1');
  });

  test('최근 읽은 레벨 = 읽기 기록이 가장 늦은 책', () => {
    const books = [book(1, 'A1', 1), book(2, 'B1', 5), book(3, 'A2', 3)];
    assert.equal(recentReadLevel(books, { 1: stat(100), 2: stat(300) }), 'B1');
    assert.equal(recentReadLevel(books, {}), null);
  });

  test('최근 만든 레벨', () => {
    assert.equal(latestCreatedLevel([book(1, 'A1', 4), book(2, 'B2', 1), book(3, 'A2', 2)]), 'B2');
    // 날짜가 모두 없으면 서버 순서(최신순)의 첫 책.
    assert.equal(latestCreatedLevel([book(1, 'A2', null), book(2, 'B1', null)]), 'A2');
    assert.equal(latestCreatedLevel([]), null);
  });
});

describe('CreateBookGuide — 문구', () => {
  test('말풍선·배지 — 이름 있음/없음', () => {
    assert.equal(genreSubtitle('지우'), '지우가 좋아하는 쪽을 골라 줘');
    assert.equal(genreSubtitle('하준'), '하준이가 좋아하는 쪽을 골라 줘');
    assert.equal(genreSubtitle(null), '좋아하는 쪽을 골라 줘');
    assert.equal(genreSubtitle(''), '좋아하는 쪽을 골라 줘');

    assert.equal(levelSubtitle('지우', 'A2'), '지우는 요즘 A2 책을 읽고 있어요');
    assert.equal(levelSubtitle('하준', null), '하준이 나이에 맞는 레벨을 골라 뒀어요');
    assert.equal(levelSubtitle(null, null), '나이에 맞는 레벨을 골라 뒀어요');

    assert.equal(recommendationBadge('지우'), '지우에게 딱 맞아요');
    assert.equal(recommendationBadge('하준'), '하준이에게 딱 맞아요');
  });

  test('미리보기 문장', () => {
    assert.equal(previewSentence(['공룡', '우주', '용기'], '동화', '를'), '공룡 · 우주 · 용기로 동화를 만들어요');
    assert.equal(previewSentence(['바다', ' ', '숲속'], '지식책', '을'), '바다 · 숲속으로 지식책을 만들어요');
    assert.equal(previewSentence(['', '  '], '동화', '를'), '곰이 알아서 재미있게 만들어 줄게요');
  });
});
