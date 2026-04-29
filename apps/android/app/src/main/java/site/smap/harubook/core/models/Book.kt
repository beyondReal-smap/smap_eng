package site.smap.harubook.core.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class CefrLevel {
    @SerialName("A1") A1,
    @SerialName("A2") A2,
    @SerialName("B1") B1;

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
data class Book(
    val id: Int,
    val profileId: Int,
    val title: String,
    val age: Int,
    val cefr: CefrLevel,
    val topic: String? = null,
    val coverImagePath: String? = null,
    val flaggedAt: Long? = null,
    val createdAt: Long? = null,
) {
    val isFlagged: Boolean get() = flaggedAt != null
}

@Serializable
data class BooksResponse(val books: List<Book>)

@Serializable
data class BookDetail(val book: Book, val passages: List<Passage>)
