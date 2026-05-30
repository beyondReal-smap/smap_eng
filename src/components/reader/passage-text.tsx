'use client';

import { Popover } from '@base-ui/react/popover';
import type { VocabularyEntry } from '@/lib/db/schema';
import { normalize, tokenize } from './shared';

/** 본문에서 vocabulary와 매칭되는 단어를 Popover trigger로 감싸 렌더. */
export function PassageText({
  text,
  vocabMap,
}: {
  text: string;
  vocabMap: Map<string, VocabularyEntry>;
}) {
  if (vocabMap.size === 0) {
    return <>{text}</>;
  }
  const tokens = tokenize(text);
  return (
    <>
      {tokens.map((tok, i) => {
        const entry = vocabMap.get(normalize(tok));
        if (!entry) {
          return <span key={i}>{tok}</span>;
        }
        return <VocabWord key={i} word={tok} entry={entry} />;
      })}
    </>
  );
}

function VocabWord({
  word,
  entry,
}: {
  word: string;
  entry: VocabularyEntry;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <button
            type="button"
            className="relative inline-block cursor-help rounded px-0.5 text-inherit underline decoration-primary/50 decoration-wavy decoration-2 underline-offset-[6px] transition-colors hover:bg-primary/10 focus:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={`${entry.word} 뜻 보기`}
          />
        }
      >
        {word}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="center">
          <Popover.Popup className="animate-bounce-in z-50 max-w-[260px] rounded-2xl border border-border/60 bg-popover px-4 py-3 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none">
            <div className="font-bold text-primary">{entry.word}</div>
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
