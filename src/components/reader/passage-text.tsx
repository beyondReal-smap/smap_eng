'use client';

import { Popover } from '@base-ui/react/popover';
import type { VocabularyEntry } from '@/lib/db/schema';
import { normalize, splitSentences, tokenize } from './shared';

/**
 * vocabulary와 매칭되는 단어만 Popover trigger로 감싸고 나머지는 그대로 렌더.
 *
 * marked는 본문 전체에서 이미 밑줄 친 단어 키 — 같은 단어가 여러 번 나와도
 * 첫 등장에만 밑줄을 남기려고 호출 간에 공유한다(두 번째부터는 평문).
 */
function renderTokens(
  text: string,
  vocabMap: Map<string, VocabularyEntry>,
  marked: Set<string>,
  onWordTap?: (word: string) => void,
) {
  if (vocabMap.size === 0) return text;
  return tokenize(text).map((tok, i) => {
    const key = normalize(tok);
    const entry = vocabMap.get(key);
    if (!entry || marked.has(key)) {
      return <span key={i}>{tok}</span>;
    }
    marked.add(key);
    return (
      <VocabWord key={i} word={tok} entry={entry} onWordTap={onWordTap} />
    );
  });
}

/**
 * 읽어 주는 구절 형광펜 — 노랑(금 75%)을 글자 아래 45%에만 칠한다(iOS ReaderMarker, 시안 "노랑 55% 아래 절반").
 * 여러 줄에 걸쳐도 줄마다 이어 칠해지도록 box-decoration-clone.
 */
const MARKER =
  'rounded-[3px] bg-[linear-gradient(transparent_55%,rgb(246_206_115/0.75)_55%)] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]';

/**
 * 본문 렌더. onSentenceTap이 주어지면 문장 단위로 감싸 탭 재생을 활성화한다.
 *
 * 문장 조각은 원문의 연속 구간(splitSentences)이라 감싸도 화면 텍스트가 변하지
 * 않는다. 밑줄 단어(뜻 팝오버)는 문장 안에 중첩되므로, 문장 클릭 핸들러에서
 * data-vocab-word 타겟을 걸러 두 인터랙션이 겹치지 않게 한다.
 */
export function PassageText({
  text,
  vocabMap,
  onWordTap,
  onSentenceTap,
  activeSentence,
  highlightAll = false,
}: {
  text: string;
  vocabMap: Map<string, VocabularyEntry>;
  /** 밑줄 단어의 뜻 팝오버가 열릴 때 호출 — 워드 헌트 미션 판정용(vocab entry의 word 전달). */
  onWordTap?: (word: string) => void;
  /** 주어지면 문장 탭 재생 활성화. (문장 index, 앞뒤 공백 제거한 문장 텍스트) */
  onSentenceTap?: (index: number, sentence: string) => void;
  /** 현재 재생 중인 문장 index — 하이라이트용. */
  activeSentence?: number | null;
  /** 쪽 전체 낭독 중 — 본문 전체에 형광펜. */
  highlightAll?: boolean;
}) {
  // 밑줄 중복 방지용 누적 집합. 렌더마다 새로 만들고 문장 순서대로만 채우므로
  // 같은 입력이면 항상 같은 결과가 나온다(렌더 순수성 유지).
  const marked = new Set<string>();
  // 문장 탭이 꺼져 있으면 기존 동작 그대로(불필요한 span 중첩 없음).
  if (!onSentenceTap) {
    const tokens = renderTokens(text, vocabMap, marked, onWordTap);
    return highlightAll ? <span className={MARKER}>{tokens}</span> : <>{tokens}</>;
  }
  return (
    <>
      {splitSentences(text).map((sentence, i) => (
        <SentenceSpan
          key={i}
          index={i}
          sentence={sentence}
          active={highlightAll || activeSentence === i}
          onSentenceTap={onSentenceTap}
        >
          {renderTokens(sentence, vocabMap, marked, onWordTap)}
        </SentenceSpan>
      ))}
    </>
  );
}

function SentenceSpan({
  index,
  sentence,
  active,
  onSentenceTap,
  children,
}: {
  index: number;
  sentence: string;
  active: boolean;
  onSentenceTap: (index: number, sentence: string) => void;
  children: React.ReactNode;
}) {
  const trimmed = sentence.trim();
  const fire = () => onSentenceTap(index, trimmed);
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`이 문장 듣기: ${trimmed}`}
      data-active={active || undefined}
      onClick={(e) => {
        // 밑줄 단어 탭은 뜻 팝오버가 처리 — 문장 재생과 겹치지 않게 무시한다.
        if ((e.target as HTMLElement).closest('[data-vocab-word]')) return;
        fire();
      }}
      onKeyDown={(e) => {
        // Space는 리더 전역 단축키(전체 낭독)라 문장 재생과 충돌한다 → Enter만 받는다.
        if (e.key !== 'Enter') return;
        e.preventDefault();
        fire();
      }}
      className={`cursor-pointer rounded-[3px] decoration-haru-coral/40 underline-offset-[10px] transition-colors hover:underline hover:decoration-dotted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? MARKER : 'hover:bg-haru-coral/5'
      }`}
    >
      {children}
    </span>
  );
}

function VocabWord({
  word,
  entry,
  onWordTap,
}: {
  word: string;
  entry: VocabularyEntry;
  onWordTap?: (word: string) => void;
}) {
  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open) onWordTap?.(entry.word);
      }}
    >
      <Popover.Trigger
        render={
          <button
            type="button"
            // 문장 탭 재생이 켜졌을 때 이 단어 클릭을 문장 재생으로 오인하지 않도록
            // SentenceSpan의 onClick이 찾는 마커.
            data-vocab-word=""
            // 단어장 단어 — 코랄 70% 점선 밑줄(그림책 리더, 네이티브와 같은 표시).
            className="relative inline cursor-help rounded px-0.5 text-inherit underline decoration-haru-coral/70 decoration-dotted decoration-[3px] underline-offset-[7px] transition-colors hover:bg-haru-coral/10 focus:bg-haru-coral/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${entry.word} 뜻 보기`}
          />
        }
      >
        {word}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="center">
          <Popover.Popup className="animate-bounce-in z-50 max-w-[260px] rounded-2xl border border-border/60 bg-popover px-4 py-3 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none">
            <div className="font-reading font-bold text-haru-coral-ink">{entry.word}</div>
            <div className="mt-0.5 text-[15px] font-medium leading-snug">
              {entry.meaning}
            </div>
            <Popover.Arrow className="text-border" />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
