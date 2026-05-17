package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class VocabEntry(
    val word: String,
    val meaning: String,
    val bookId: Int,
    val bookTitle: String,
)

@Serializable
data class VocabResponse(val entries: List<VocabEntry>)
