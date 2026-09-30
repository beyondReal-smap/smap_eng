import { BADGES, type RewardStats } from '@/lib/rewards';
import { cn } from '@/lib/utils';

/** 배지 id → public/images/haru/sticker_*.{webp,png}. 새 배지를 추가하면 스티커 그림도 함께 추가. */
const STICKER_ASSET: Record<string, string> = {
  'first-book': 'sticker_first_book',
  bookworm: 'sticker_bookworm',
  'first-perfect': 'sticker_first_perfect',
  'quiz-master': 'sticker_quiz_master',
  'word-collector': 'sticker_word_collector',
  'word-doctor': 'sticker_word_doctor',
};

/** 모은 스티커별 결정적 기울기. */
const TILTS = [-8, 6, -4, 5, -6, 3];

/**
 * "스티커 북" — 배지 6종(iOS StickerBookCard). 모은 스티커는 일러스트(살짝 기울임),
 * 아직인 스티커는 같은 모양의 실루엣 + 목표 문구("…으면 만나요", 결핍 표현 금지).
 */
export function StickerBook({ stats }: { stats: RewardStats }) {
  const earnedCount = BADGES.filter((b) => b.earned(stats)).length;
  return (
    <section aria-labelledby="sticker-book-title" className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 id="sticker-book-title" className="text-lg font-extrabold tracking-normal text-haru-ink">스티커 북</h2>
        <p className="text-[13px] font-bold tabular-nums text-haru-muted">
          <span aria-hidden>{earnedCount} / {BADGES.length} 모음</span>
          <span className="sr-only">{BADGES.length}개 중 {earnedCount}개 모음</span>
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-4 rounded-[22px] bg-[linear-gradient(180deg,#fff7ea,#fff1de)] p-4 shadow-[0_8px_20px_rgb(168_111_63/0.12)]">
        {BADGES.map((badge, i) => {
          const earned = badge.earned(stats);
          const asset = STICKER_ASSET[badge.id];
          if (!asset) throw new Error(`스티커 그림이 없는 배지 id: ${badge.id}`);
          const base = `/images/haru/${asset}`;
          return (
            <li key={badge.id} className="flex flex-col items-center text-center">
              <span className="sr-only">
                {badge.title}, {earned ? `모음, ${badge.description}` : `아직, ${badge.hint}`}
              </span>
              <span aria-hidden className="block size-[76px] py-[5px] sm:size-[88px]">
                {earned ? (
                  <picture className="block size-full" style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}>
                    <source srcSet={`${base}.webp`} type="image/webp" />
                    <img src={`${base}.png`} alt="" width={88} height={88} className="size-full object-contain" />
                  </picture>
                ) : (
                  // 실루엣 — 같은 그림을 마스크로 써 윤곽만 옅은 베이지로 칠한다.
                  <span
                    className="block size-full bg-[#eadccb]"
                    style={{
                      maskImage: `url(${base}.png)`,
                      WebkitMaskImage: `url(${base}.png)`,
                      maskSize: 'contain',
                      WebkitMaskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                    }}
                  />
                )}
              </span>
              <span aria-hidden className={cn('mt-1.5 text-[13px] font-bold', earned ? 'text-haru-ink' : 'text-haru-muted')}>
                {badge.title}
              </span>
              {!earned ? (
                <span aria-hidden className="mt-0.5 text-[11px] font-bold leading-snug text-haru-muted">
                  {badge.hint}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
