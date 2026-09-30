// 그림책 세계 공용 순수 함수 — 조사·인사 문구·아바타 표·이번 주 연속 학습.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { greetingCopy } from '@/components/bookshelf/greeting';
import { avatarAssetName } from '@/components/haru/avatar-art';
import { subject, vocative } from './korean-particle';
import { weeklyStreak } from './weekly-streak';

describe('KoreanParticle', () => {
  test('부르는 말 — 받침 있으면 아, 없거나 한글이 아니면 야', () => {
    assert.equal(vocative('지우'), '지우야');
    assert.equal(vocative('하준'), '하준아');
    assert.equal(vocative('Mia'), 'Mia야');
  });

  test('주격 — 지우가 / 하준이가', () => {
    assert.equal(subject('지우'), '지우가');
    assert.equal(subject('하준'), '하준이가');
  });
});

describe('GreetingCopy', () => {
  test('상황별 문구', () => {
    assert.deepEqual(greetingCopy('continueReading', '지우'), {
      firstLine: '지우야, 어제 읽던 책',
      secondLine: '마저 읽어 볼까?',
    });
    assert.deepEqual(greetingCopy('pickABook', '하준'), {
      firstLine: '하준아, 오늘은',
      secondLine: '어떤 이야기를 읽을까?',
    });
    assert.deepEqual(greetingCopy('firstBook', '지우'), {
      firstLine: '안녕, 지우야!',
      secondLine: '첫 동화를 같이 만들어 볼까?',
    });
    assert.equal(greetingCopy('firstBook', null).firstLine, '안녕!');
    assert.equal(greetingCopy('loadFailed', '지우').firstLine, '앗, 책장을 불러오지 못했어');
  });
});

describe('AvatarArt', () => {
  test('표에 있는 이모지는 에셋, 변형 선택자는 무시', () => {
    assert.equal(avatarAssetName('🦊'), 'avatar_fox');
    assert.equal(avatarAssetName('⭐️'), 'avatar_star');
    assert.equal(avatarAssetName('⭐'), 'avatar_star');
    assert.equal(avatarAssetName('🐢'), null);
  });
});

describe('WeeklyStreak', () => {
  // 2026-09-30은 수요일.
  const today = new Date(2026, 8, 30, 15, 0);

  test('월요일 시작 7칸과 오늘 표시', () => {
    const streak = weeklyStreak(new Set(['2026-09-28']), today);
    assert.deepEqual(
      streak.days.map((d) => d.key),
      ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'],
    );
    assert.equal(streak.days[2].isToday, true);
    assert.equal(streak.activeCount, 1);
  });

  test('오늘 읽었으면 오늘부터, 아직이면 어제부터 센다', () => {
    assert.equal(weeklyStreak(new Set(['2026-09-28', '2026-09-29', '2026-09-30']), today).streak, 3);
    assert.equal(weeklyStreak(new Set(['2026-09-27', '2026-09-28', '2026-09-29']), today).streak, 3);
    assert.equal(weeklyStreak(new Set(['2026-09-28']), today).streak, 0);
  });
});
