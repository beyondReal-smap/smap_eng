package site.smap.harubook.core.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * iOS `Book.swift` 미러. CEFR 4종 + 책 + 본문 어휘.
 */
@Serializable
enum class CefrLevel {
    @SerialName("A1") A1,
    @SerialName("A2") A2,
    @SerialName("B1") B1,
    @SerialName("B2") B2;

    val label: String get() = name

    companion object {
        fun recommended(forAge: Int): List<CefrLevel> = when {
            forAge < 7 -> listOf(A1)
            forAge in 7..8 -> listOf(A1, A2)
            else -> listOf(A2, B1)
        }
    }
}

@Serializable
data class VocabularyEntry(
    val word: String,
    val meaning: String,
)

/**
 * 책 속 미션 — 웹 `schema.ts`의 `Mission` 미러. 리더가 특정 passage에서 노출하는 게임 요소.
 *
 * LLM 변동성에 fail-soft: 모든 필드에 기본값을 둬 일부 필드 누락으로 Book 전체 디코딩이
 * 깨지지 않게 하고, 범위/단어 존재 검증은 렌더 전에 ReaderViewModel이 수행한다.
 * wordHunt/check 중 하나만 오는 게 정상이지만 둘 다 있어도 각각 렌더한다.
 */
@Serializable
data class MissionWordHunt(
    /** 해당 passage의 en 본문에 그대로 등장하는 단어. */
    val targetWord: String = "",
    /** 아이에게 보여줄 한국어 힌트 (예: "'용감한'이라는 뜻의 단어를 찾아봐!"). */
    val hintKo: String = "",
)

@Serializable
data class MissionCheck(
    val question: String = "",
    /** 2지선다 선택지. */
    val choices: List<String> = emptyList(),
    /** 정답 인덱스 (0|1). */
    val answerIndex: Int = 0,
)

@Serializable
data class Mission(
    /** passages.orderIndex와 매칭되는 0-based 인덱스. */
    val passageIndex: Int = -1,
    val wordHunt: MissionWordHunt? = null,
    val check: MissionCheck? = null,
)

@Serializable
data class Book(
    val id: Int,
    val profileId: Int,
    val title: String,
    val age: Int,
    val cefr: CefrLevel,
    val topic: String? = null,
    val coverImagePath: String? = null,
    val vocabulary: List<VocabularyEntry>? = null,
    /** 책 속 미션. null=레거시 책 또는 LLM 미출력 — 미션 UI 없이 렌더(fail-soft). */
    val missions: List<Mission>? = null,
    /** ISO8601 문자열. 백엔드 기본 Date 직렬화 결과(`2026-04-22T14:21:26.000Z`). */
    val flaggedAt: String? = null,
    val createdAt: String? = null,
) {
    val isFlagged: Boolean get() = !flaggedAt.isNullOrEmpty()
}

@Serializable
data class BooksResponse(val books: List<Book>)

@Serializable
data class BookDetail(val book: Book, val passages: List<Passage>)
