// 단어 카드 뒷면 "책 속 문장"·앞면 삽화 선택 규칙 — iOS `HaruBookTests/VocabBookContextTests.swift`와 같은 케이스.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  firstSentenceContaining,
  vocabSentences,
  wordHighlightRange,
  wordScene,
  type ContextPassage,
} from './book-context';

function passage(order: number, text: string, scene: string | null = null): ContextPassage {
  return { orderIndex: order, textEn: text, sceneImagePath: scene };
}

describe('VocabBookContext', () => {
  test('문장 나누기 — 구두점·닫는 따옴표 유지', () => {
    assert.deepEqual(vocabSentences('They went out. "Wow!" said Mia. Is it warm?'), [
      'They went out.',
      '"Wow!"',
      'said Mia.',
      'Is it warm?',
    ]);
  });

  test('단어 경계·대소문자 무시로 첫 문장', () => {
    const passages = [
      passage(0, 'The baker smiled. Bakery bread is warm.'),
      passage(1, 'They bought warm bread at the bakery.'),
    ];
    assert.equal(firstSentenceContaining('bakery', passages)?.sentence, 'Bakery bread is warm.');
    // "bake"는 "baker"·"bakery" 안에서 걸리지 않는다.
    assert.equal(firstSentenceContaining('bake', passages), null);
  });

  test('형광펜 구간은 단어만', () => {
    const sentence = 'They bought warm bread at the Bakery.';
    const range = wordHighlightRange('bakery', sentence);
    assert.equal(range && sentence.slice(range.start, range.end), 'Bakery');
  });

  test('삽화 우선순위', () => {
    // 1) 그 문장의 장면 삽화
    assert.deepEqual(
      wordScene('cat', { coverImagePath: 'cover.png' }, [
        passage(0, 'A dog ran.', 's0.png'),
        passage(1, 'The cat slept.', 's1.png'),
      ]),
      { sentence: 'The cat slept.', imagePath: 's1.png' },
    );
    // 2) 문장 passage에 삽화가 없으면 책의 아무 장면 삽화
    assert.equal(
      wordScene('cat', { coverImagePath: 'cover.png' }, [
        passage(0, 'A dog ran.', 's0.png'),
        passage(1, 'The cat slept.', null),
      ]).imagePath,
      's0.png',
    );
    // 3) 장면 삽화가 하나도 없으면 표지, 4) 표지도 없으면 null(자리표시)
    assert.equal(
      wordScene('cat', { coverImagePath: 'cover.png' }, [passage(0, 'The cat slept.', '')]).imagePath,
      'cover.png',
    );
    const noArt = [passage(0, 'The cat slept.')];
    assert.equal(wordScene('cat', { coverImagePath: null }, noArt).imagePath, null);
    // 문장을 못 찾으면 문장만 생략
    assert.equal(wordScene('zebra', { coverImagePath: null }, noArt).sentence, null);
  });

  test('정규식 특수 문자가 든 단어도 글자 그대로', () => {
    const passages = [passage(0, 'We saw aab here. Then I wrote a+b today.')];
    // "+"가 정규식 반복으로 해석되면 "aab"에 걸린다 — 글자 그대로만 찾아야 한다.
    assert.equal(firstSentenceContaining('a+b', passages)?.sentence, 'Then I wrote a+b today.');
  });
});
