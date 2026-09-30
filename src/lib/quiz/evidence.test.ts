// 퀴즈 "책 속 근거" 문장 매칭 규칙 — iOS `HaruBookTests/QuizEvidenceTests.swift`와 같은 입력·기대값.
// 실행: pnpm test (node --test)

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  coreWords,
  findEvidence,
  isRelated,
  questionKeywords,
  type EvidenceMatch,
  type EvidencePassage,
} from './evidence';

function passage(order: number, text: string, scene: string | null = null): EvidencePassage {
  return { orderIndex: order, textEn: text, sceneImagePath: scene };
}

function highlighted(match: EvidenceMatch | null): string[] | undefined {
  return match?.highlights.map((r) => match.sentence.slice(r.start, r.end));
}

describe('QuizEvidence', () => {
  test('앞쪽 불용어만 뗀 핵심 단어', () => {
    assert.deepEqual(coreWords('In a quiet town'), ['quiet', 'town']);
    assert.deepEqual(coreWords('A red button.'), ['red', 'button']);
    // 가운데 불용어는 남긴다 — 앞쪽만 뗀다.
    assert.deepEqual(coreWords('The girl by the tree'), ['girl', 'by', 'the', 'tree']);
    // 불용어뿐이면 찾을 게 없다.
    assert.deepEqual(coreWords('On the'), []);
  });

  test('구절 일치 — 첫 문장과 쪽 번호', () => {
    const passages = [
      passage(1, 'They played all day. Then they went home.', '/img/2.png'),
      passage(0, 'Jisoo lived in a quiet town near green rice fields. She liked it.', '/img/1.png'),
    ];
    const match = findEvidence('In a quiet town', '', passages);
    assert.equal(match?.pageNumber, 1);
    assert.equal(match?.sentence, 'Jisoo lived in a quiet town near green rice fields.');
    assert.deepEqual(highlighted(match), ['quiet town']);
    assert.equal(match?.sceneImagePath, '/img/1.png');
  });

  test('구절이 떨어져 있으면 모든 단어 일치로', () => {
    const passages = [
      passage(0, 'The button was small.'),
      passage(1, 'Her button, the red one, was missing.'),
    ];
    const match = findEvidence('A red button', '', passages);
    assert.equal(match?.pageNumber, 2);
    assert.equal(match?.sentence, 'Her button, the red one, was missing.');
    // 단어마다 첫 등장을 원문 순서대로 칠한다.
    assert.deepEqual(highlighted(match), ['button', 'red']);
  });

  test('앞선 단어 일치보다 구절 일치가 우선', () => {
    const passages = [
      passage(0, 'The town was quiet at night.'),
      passage(1, 'It was a quiet town.'),
    ];
    assert.equal(findEvidence('a quiet town', '', passages)?.pageNumber, 2);
  });

  test('못 찾으면 null', () => {
    const passages = [passage(0, 'Jisoo lived in a quiet town.')];
    assert.equal(findEvidence('On a mountain', '', passages), null);
    assert.equal(findEvidence('the', '', passages), null);
    assert.equal(findEvidence('In a quiet town', '', []), null);
  });

  test('대소문자·구두점 무시, 단어 경계 준수', () => {
    const passages = [
      passage(0, 'The quiet townhouse was big.'),
      passage(1, '"Look!" said Mia. A QUIET, TOWN appeared?'),
    ];
    // 1쪽 "quiet townhouse"의 "town"은 단어 경계라 걸리지 않고, 쉼표·대문자는 무시한다.
    const match = findEvidence('quiet town!', '', passages);
    assert.equal(match?.pageNumber, 2);
    assert.equal(match?.sentence, 'A QUIET, TOWN appeared?');
    assert.deepEqual(highlighted(match), ['QUIET, TOWN']);
  });

  test('후보가 여럿이면 질문과 가장 많이 겹치는 문장', () => {
    const passages = [
      passage(0, 'Jisoo lived in a quiet town near green rice fields.'),
      passage(1, 'One morning, she found a small red button on the road.'),
      passage(2, '"Whose button is this?" she asked her friend Minho.'),
      passage(3, 'They walked quietly past the bakery and the old library.'),
      passage(4, 'A little girl was crying under a big tree.'),
      passage(5, 'Her coat was missing one red button.'),
    ];
    const match = findEvidence('A red button', 'What was missing from the coat?', passages);
    assert.equal(match?.pageNumber, 6);
    assert.equal(match?.sentence, 'Her coat was missing one red button.');
    assert.deepEqual(highlighted(match), ['red button']);
  });

  test('동점이면 앞선 문장', () => {
    const passages = [passage(0, 'Mia saw a red kite.'), passage(1, 'Tom saw a red kite too.')];
    assert.equal(findEvidence('A red kite', 'What was in the sky?', passages)?.pageNumber, 1);
  });

  test('후보가 하나면 겹침이 없어도 사용', () => {
    const passages = [passage(0, 'The sun was warm.'), passage(1, 'She held a blue cup.')];
    assert.equal(findEvidence('A blue cup', 'Who came home late?', passages)?.pageNumber, 2);
  });

  test('질문 겹침은 가벼운 어미 처리를 쓴다', () => {
    const passages = [
      passage(0, 'Jisoo saw the quiet town from a hill.'),
      passage(1, 'Jisoo lived in the quiet town.'),
    ];
    assert.equal(findEvidence('the quiet town', 'Where did Jisoo live?', passages)?.pageNumber, 2);
    assert.ok(isRelated('lived', 'live'));
    assert.ok(isRelated('living', 'live'));
    assert.ok(isRelated('coats', 'coat'));
    assert.ok(isRelated('missing', 'miss'));
    assert.ok(!isRelated('town', 'townhouse'));
  });

  test('질문 핵심 단어는 불용어·의문사를 뺀다', () => {
    assert.deepEqual(questionKeywords('What was missing from the coat?'), ['missing', 'from', 'coat']);
    assert.deepEqual(questionKeywords('Where did Jisoo live?'), ['jisoo', 'live']);
  });

  test('굽은 작은따옴표는 곧은 따옴표와 같다', () => {
    const passages = [passage(0, 'It was Jisoo’s mom.')];
    assert.deepEqual(highlighted(findEvidence("Jisoo's mom", '', passages)), ['Jisoo’s mom']);
  });
});
