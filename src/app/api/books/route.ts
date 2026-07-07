import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import {
  BookGenreSchema,
  BookIntakeSchema,
  LevelSchema,
  generateBook,
} from '@/lib/llm';
import {
  getBookProgressMap,
  insertBookWithPassages,
  listBooks,
} from '@/lib/db/queries';
import { CEFR_LEVELS, type Mission } from '@/lib/db/schema';
// 워드 헌트 판정을 리더(PassageText 토큰 매칭)와 동일한 규칙으로 수행하기 위해 재사용.
// reader/shared는 React 의존 없는 순수 모듈이라 서버에서 import해도 안전하다.
import { normalize, tokenize } from '@/components/reader/shared';
import { consumeCredit, refundCredit } from '@/lib/billing/credits';
import { requireProfileOwnershipForApi } from '@/lib/auth/session';
import { startBookTtsBatch } from '@/lib/tts/batch';
import { sendPushToUser } from '@/lib/push/send';
import { handleApiError } from '../_lib/errors';

export const runtime = 'nodejs';

const GenerateBookSchema = z.object({
  profileId: z.number().int().positive(),
  level: LevelSchema,
  // 자유 토픽 1줄(레거시 호환). 마법사 신규 흐름에서는 비어 있고 intake가 채워진다.
  topic: z.string().min(1).max(80).optional(),
  // 'fiction' | 'non_fiction'. 미지정 시 'fiction' 기본 — 기존 호출처 호환.
  genre: BookGenreSchema.optional(),
  // 마법사 step 3 답변. answers 비어 있어도 OK(모두 건너뛴 경우).
  intake: BookIntakeSchema.optional(),
});

/**
 * 별 차감 보상 시도 — 실패 시 운영자가 수동 보상할 수 있도록 구조화 로그 출력.
 * 정상 환불 시 [credit_refunded], 환불 자체가 실패한 경우에만 [credit_lost_refund_failed].
 * idempotent: 동일 consumeTxId로 재호출되면 'noop'.
 */
async function refundOrLogLost(
  userId: string,
  consumeTxId: number,
  stage: 'llm' | 'db_insert',
  cause: unknown,
): Promise<void> {
  const causeMessage = cause instanceof Error ? cause.message : String(cause);
  try {
    const result = await refundCredit(userId, consumeTxId);
    console.warn('[credit_refunded]', JSON.stringify({
      stage,
      userId,
      consumeTxId,
      refundTxId: result.refundTxId,
      status: result.status,
      balanceAfter: result.balance,
      cause: causeMessage,
      at: new Date().toISOString(),
    }));
  } catch (refundErr) {
    console.error('[credit_lost_refund_failed]', JSON.stringify({
      stage,
      userId,
      consumeTxId,
      cause: causeMessage,
      refundError:
        refundErr instanceof Error ? refundErr.message : String(refundErr),
      at: new Date().toISOString(),
    }));
  }
}

/**
 * LLM이 출력한 미션을 저장 전에 정규화 — fail-soft 경계 검증.
 * 범위 밖 passageIndex는 미션째 제거, 워드 헌트는 (a) 해당 passage 본문에 실제로
 * 등장하고 (b) vocabulary 엔트리(리더의 밑줄·탭 대상)에 있어야 유지한다.
 * 매칭 규칙은 리더와 동일하게 tokenize+normalize 단어 경계 판정 — 부분 문자열
 * 매칭("art" ⊂ "started")으로 탭 불가능한 죽은 미션이 저장되는 것을 막는다.
 * 남는 게 없으면 null = 미션 없는 책 (리더는 미션 UI를 그리지 않음).
 */
function normalizeMissions(
  missions: Mission[] | undefined,
  passages: { en: string }[],
  vocabulary: { word: string }[],
): Mission[] | null {
  if (!missions?.length) return null;
  const vocabWords = new Set(
    vocabulary.map((v) => normalize(v.word)).filter(Boolean),
  );
  const out: Mission[] = [];
  for (const m of missions) {
    if (m.passageIndex < 0 || m.passageIndex >= passages.length) continue;
    const passageTokens = new Set(
      tokenize(passages[m.passageIndex].en).map(normalize),
    );
    const target = m.wordHunt ? normalize(m.wordHunt.targetWord) : '';
    const wordHunt =
      m.wordHunt && target && passageTokens.has(target) && vocabWords.has(target)
        ? m.wordHunt
        : undefined;
    if (!wordHunt && !m.check) continue;
    out.push({ passageIndex: m.passageIndex, wordHunt, check: m.check });
  }
  return out.length > 0 ? out : null;
}

/** 동화 1편 생성 — LLM 호출 + DB 일괄 저장. */
export async function POST(req: NextRequest) {
  try {
    const body = GenerateBookSchema.parse(await req.json());
    // 인증 + 자녀 프로필 소유권 검증을 한 번에 — 타 user 프로필 ID로 책 생성 차단(BOLA).
    const { userId } = await requireProfileOwnershipForApi(body.profileId);
    // 별 1개를 LLM 호출 전에 차감 — 잔액 부족 시 OpenAI 비용 발생 차단.
    // 정책: LLM/DB 실패 시 refundCredit 자동 보상 (idempotent). 환불 자체가 실패한 경우에만
    // [credit_lost_refund_failed] 로그로 운영자 수동 보상 trigger.
    const consumed = await consumeCredit(userId);

    const genre = body.genre ?? 'fiction';

    const t0 = Date.now();
    let story;
    try {
      story = await generateBook({
        level: body.level,
        genre,
        topic: body.topic,
        intake: body.intake,
      });
      console.log(`[books-create] llm ok in ${Date.now() - t0}ms (cefr=${body.level.cefr} genre=${genre})`);
    } catch (e) {
      console.error(`[books-create] llm failed after ${Date.now() - t0}ms`, {
        userId,
        cefr: body.level.cefr,
        genre,
        error: e instanceof Error ? e.message : String(e),
      });
      await refundOrLogLost(userId, consumed.txId, 'llm', e);
      throw e;
    }

    // 픽션은 alternateEnding만, 논픽션은 funFacts만 저장 — 다른 한쪽은
    // 프롬프트로 출력 금지를 유도하지만 fail-soft 차원에서 명시적으로 null 처리.
    const isFiction = genre === 'fiction';
    const alternateEndingForDb = isFiction ? story.alternateEnding ?? null : null;
    const funFactsForDb = !isFiction ? story.funFacts ?? null : null;
    const missionsForDb = normalizeMissions(
      story.missions,
      story.passages,
      story.vocabulary ?? [],
    );

    let book;
    try {
      book = await insertBookWithPassages(
        {
          profileId: body.profileId,
          title: story.title,
          age: body.level.age,
          cefr: body.level.cefr,
          topic: story.topic,
          genre,
          vocabulary: story.vocabulary ?? [],
          alternateEnding: alternateEndingForDb,
          funFacts: funFactsForDb,
          missions: missionsForDb,
          // intake 답변은 책 카드/디버그 용도로 보존. 빈 답변 정규화는 LLM 측에서 이미 수행.
          intake: body.intake ?? null,
        },
        story.passages.map((p, i) => ({
          orderIndex: i,
          textEn: p.en,
          textKo: p.ko,
        })),
      );
    } catch (e) {
      await refundOrLogLost(userId, consumed.txId, 'db_insert', e);
      throw e;
    }

    // 응답을 내보낸 뒤 백그라운드 작업 2종:
    //  1) 책의 모든 passage TTS 순차 생성 — Reader 열릴 때 문장 전환 지연 감소
    //  2) 가족의 다른 디바이스에 새 동화 알림 푸시
    //
    // 생성한 디바이스는 보통 포그라운드라 iOS가 알림을 무음 처리하지만, 보호자의 다른 단말
    // (태블릿/배우자 폰)에는 정상 표시. fire-and-forget — 푸시 실패가 본 응답을 막지 않는다.
    const bookTitle = book.title;
    after(() => {
      startBookTtsBatch(book.id);
      void sendPushToUser(userId, {
        title: '새 동화가 준비됐어요',
        body: `${bookTitle} — 지금 함께 읽어볼까요?`,
        sound: 'default',
        custom: { kind: 'book_created', bookId: book.id },
      }).catch((err) => {
        console.warn('[books-create] push failed', err);
      });
    });

    return NextResponse.json(
      {
        book,
        passages: story.passages,
        vocabulary: story.vocabulary ?? [],
        alternateEnding: alternateEndingForDb,
        funFacts: funFactsForDb,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

const ListBooksQuery = z.object({
  profileId: z.coerce.number().int().positive(),
  age: z.coerce.number().int().min(5).max(10).optional(),
  cefr: z.enum(CEFR_LEVELS).optional(),
  q: z.string().trim().min(1).max(80).optional(),
});

/**
 * 책장: 프로필별 책 목록 + 책별 최신 진도 스냅샷.
 * 응답의 `stats`는 `{ [bookId]: { progressRatio, quizScore, finishedAtUnix, startedAtUnix } }`.
 */
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = ListBooksQuery.parse(params);
    // 자기 가족의 자녀 프로필만 조회 가능. 타 user 프로필 책 enumeration 차단.
    await requireProfileOwnershipForApi(parsed.profileId);
    // 소유권 가드 통과 후 두 쿼리는 서로 독립(books 테이블 / readingLogs 테이블)이라
    // 병렬 실행 — DB 왕복 1회를 절약한다.
    const [books, stats] = await Promise.all([
      listBooks(parsed),
      getBookProgressMap(parsed.profileId),
    ]);
    return NextResponse.json({ books, stats });
  } catch (err) {
    return handleApiError(err);
  }
}
