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
