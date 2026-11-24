import { Mascot, SpeechBubble } from '@/components/haru';

/*
 * 통계 "독서 나무" 히어로 — 완독한 책 한 권마다 나무에 열매가 하나씩(iOS ReadingTreeCard와 같은 좌표).
 * 그림은 시안(r7/stats.html)의 361×330 좌표계. 높이 330 고정, 하늘·언덕은 카드 폭 전체로 늘리고
 * 나무는 비율을 지켜 가운데. 장식 색은 그림 전용이라 이 파일에 둔다.
 */

const FRUIT_COLORS = ['#f5835c', '#f2b441', '#e86a8c'];
/** 열매 자리 12개(시안 좌표). 모두 잎 원 안쪽. */
const FRUIT_SLOTS: Array<[number, number]> = [
  [176, 98], [236, 80], [262, 136], [150, 150], [214, 150], [286, 92],
  [188, 186], [130, 118], [205, 40], [300, 160], [238, 178], [170, 58],
];

export function ReadingTree({ booksRead }: { booksRead: number }) {
  const filled = Math.min(booksRead, FRUIT_SLOTS.length);
  const overflow = booksRead - FRUIT_SLOTS.length;
  return (
    <div
      role="img"
      aria-label={booksRead === 0 ? '독서 나무, 아직 완독한 책이 없어요' : `독서 나무, 완독한 책 ${booksRead}권`}
      className="relative h-[330px] overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#cfe8f7_0%,#f9ebd2_70%)] shadow-[0_8px_24px_rgb(168_111_63/0.16)]"
    >
      {/* 언덕 2겹 — 가로로만 늘인다. */}
      <svg aria-hidden viewBox="0 0 361 330" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d="M0 270 Q90 245 180 262 Q270 279 361 255 L361 330 L0 330 Z" fill="#a8d98e" />
        <path d="M0 295 Q120 272 240 290 Q360 308 361 285 L361 330 L0 330 Z" fill="#8cc97a" />
      </svg>
      {/* 나무 — 비율 유지, 가운데. */}
      <svg aria-hidden viewBox="0 0 361 330" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full">
        <rect x="196" y="150" width="30" height="125" rx="10" fill="#9a6a42" />
        <path d="M211 200 Q181 180 163 154" stroke="#9a6a42" strokeWidth="12" strokeLinecap="round" fill="none" />
        <circle cx="211" cy="118" r="78" fill="#6fae63" />
        <circle cx="150" cy="140" r="46" fill="#7cbb6d" />
        <circle cx="272" cy="140" r="50" fill="#7cbb6d" />
        <circle cx="212" cy="72" r="46" fill="#86c476" />
        {FRUIT_SLOTS.map(([x, y], i) =>
          i < filled ? (
            <g key={i}>
              <circle cx={x} cy={y} r="12" fill={FRUIT_COLORS[i % FRUIT_COLORS.length]} />
              <circle cx={x - 4} cy={y - 4} r="3" fill="rgb(255 255 255 / 0.7)" />
            </g>
          ) : i < filled + 2 ? (
            // 다음 열매 예고 — 흰 점선 원 2개.
            <circle key={i} cx={x} cy={y} r="11" fill="none" stroke="rgb(255 255 255 / 0.9)" strokeWidth="2" strokeDasharray="3 4" />
          ) : null,
        )}
      </svg>

      {overflow > 0 ? (
        <span
          aria-hidden
          className="absolute right-4 top-[150px] rounded-full border-2 border-white bg-haru-coral-soft px-2.5 py-[5px] text-sm font-extrabold tabular-nums text-haru-on-coral"
        >
          +{overflow}
        </span>
      ) : null}

      <Mascot pose={booksRead === 0 ? 'reading' : 'normal'} size={112} className="absolute bottom-2.5 left-7" />

      <div aria-hidden className="absolute left-1.5 right-[120px] top-4 flex">
        <SpeechBubble>
          <p className="whitespace-pre-line text-[15px] font-bold leading-snug text-haru-ink">
            {booksRead === 0 ? (
              '첫 책을 읽으면\n첫 열매가 열려!'
            ) : (
              <>
                책 <em className="not-italic text-haru-coral-ink">{booksRead}권</em>을 읽어서{'\n'}열매가{' '}
                <em className="not-italic text-haru-coral-ink">{booksRead}개</em> 열렸어!
              </>
            )}
          </p>
        </SpeechBubble>
      </div>
    </div>
  );
}

/** 나무 아래 미니 수치 4칸(완독 세션 / 만점 / 정답률 / 포인트). */
export function MiniStats({
  finishedSessions,
  perfectScores,
  averageAccuracy,
  points,
}: {
  finishedSessions: number;
  perfectScores: number;
  /** 0~1, null이면 퀴즈 기록 없음("—"). */
  averageAccuracy: number | null;
  points: number;
}) {
  const pct = averageAccuracy === null ? null : Math.round(averageAccuracy * 100);
  const cells = [
    { value: String(finishedSessions), label: '완독', spoken: `완독 ${finishedSessions}회` },
    { value: String(perfectScores), label: '만점', spoken: `만점 ${perfectScores}회` },
    {
      value: pct === null ? '—' : `${pct}%`,
      label: '정답률',
      spoken: pct === null ? '평균 정답률, 아직 퀴즈 기록이 없어요' : `평균 정답률 ${pct}퍼센트`,
    },
    { value: points.toLocaleString(), label: '포인트', spoken: `포인트 ${points}점` },
  ];
  return (
    <ul className="grid grid-cols-4 gap-2">
      {cells.map((c) => (
        <li
          key={c.label}
          className="flex flex-col items-center rounded-[14px] bg-white/90 px-1.5 py-2.5 shadow-[0_3px_8px_rgb(168_111_63/0.08)]"
        >
          <span aria-hidden className="text-xl font-extrabold tabular-nums text-haru-ink">{c.value}</span>
          <span aria-hidden className="text-xs font-bold text-haru-muted">{c.label}</span>
          <span className="sr-only">{c.spoken}</span>
        </li>
      ))}
    </ul>
  );
}
