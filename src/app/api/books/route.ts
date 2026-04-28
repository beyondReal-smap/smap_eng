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
import { CEFR_LEVELS } from '@/lib/db/schema';
import { consumeCredit, refundCredit } from '@/lib/billing/credits';
import { requireProfileOwnershipForApi } from '@/lib/auth/session';
import { startBookTtsBatch } from '@/lib/tts/batch';
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

    let story;
    try {
      story = await generateBook({
        level: body.level,
        genre,
        topic: body.topic,
        intake: body.intake,
      });
    } catch (e) {
      await refundOrLogLost(userId, consumed.txId, 'llm', e);
      throw e;
    }

    // 픽션은 alternateEnding만, 논픽션은 funFacts만 저장 — 다른 한쪽은
    // 프롬프트로 출력 금지를 유도하지만 fail-soft 차원에서 명시적으로 null 처리.
    const isFiction = genre === 'fiction';
    const alternateEndingForDb = isFiction ? story.alternateEnding ?? null : null;
    const funFactsForDb = !isFiction ? story.funFacts ?? null : null;

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

    // 응답을 내보낸 뒤 백그라운드로 책의 모든 passage TTS를 순차 생성.
    // Reader가 열릴 때쯤이면 상당수가 준비되어 문장 전환 지연이 사라진다.
    after(() => {
      startBookTtsBatch(book.id);
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
    const books = await listBooks(parsed);
    const stats = await getBookProgressMap(parsed.profileId);
    return NextResponse.json({ books, stats });
  } catch (err) {
    return handleApiError(err);
  }
}
