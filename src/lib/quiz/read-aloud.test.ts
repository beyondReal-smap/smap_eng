// 퀴즈 읽어 주기 순서·강조 규칙 — iOS `HaruBookTests/QuizReadAloudPlanTests.swift`와 같은 케이스.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { highlightedChoice, readAloudSequence, readAloudText } from './read-aloud';

const question = 'Where did Jisoo live?';
const choices = ['In a quiet town', 'By the sea', 'In a big city', 'On a mountain'];

describe('QuizReadAloudPlan', () => {
  test('답하기 전엔 질문 → 선택지 전부', () => {
    assert.deepEqual(readAloudSequence(4, false), [
      { kind: 'question' },
      { kind: 'choice', index: 0 },
      { kind: 'choice', index: 1 },
      { kind: 'choice', index: 2 },
      { kind: 'choice', index: 3 },
    ]);
  });

  test('답한 뒤엔 질문만', () => {
    assert.deepEqual(readAloudSequence(4, true), [{ kind: 'question' }]);
  });

  test('선택지가 없으면 질문만', () => {
    assert.deepEqual(readAloudSequence(0, false), [{ kind: 'question' }]);
    assert.deepEqual(readAloudSequence(-1, false), [{ kind: 'question' }]);
  });

  test('항목별 읽을 문장', () => {
    assert.equal(readAloudText({ kind: 'question' }, { question, choices, evidenceSentence: null }), question);
    assert.equal(
      readAloudText({ kind: 'choice', index: 2 }, { question, choices, evidenceSentence: null }),
      'In a big city',
    );
    assert.equal(
      readAloudText({ kind: 'evidence' }, { question, choices, evidenceSentence: '  Jisoo lived here.  ' }),
      'Jisoo lived here.',
    );
  });

  test('없거나 비었거나 너무 길면 null', () => {
    assert.equal(readAloudText({ kind: 'choice', index: 4 }, { question, choices, evidenceSentence: null }), null);
    assert.equal(readAloudText({ kind: 'evidence' }, { question, choices, evidenceSentence: null }), null);
    assert.equal(readAloudText({ kind: 'question' }, { question: '   ', choices, evidenceSentence: null }), null);
    // 서버 `/api/tts/word` 상한 200자 — 200자는 읽고 201자는 건너뛴다.
    const limit = 'a'.repeat(200);
    assert.equal(readAloudText({ kind: 'evidence' }, { question, choices, evidenceSentence: limit }), limit);
    assert.equal(readAloudText({ kind: 'evidence' }, { question, choices, evidenceSentence: `${limit}a` }), null);
  });

  test('선택지 항목만 강조', () => {
    assert.equal(highlightedChoice({ kind: 'choice', index: 1 }), 1);
    assert.equal(highlightedChoice({ kind: 'question' }), null);
    assert.equal(highlightedChoice({ kind: 'evidence' }), null);
    assert.equal(highlightedChoice(null), null);
  });
});
