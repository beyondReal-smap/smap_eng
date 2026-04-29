package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class Passage(
    val id: Int,
    val bookId: Int,
    val orderIndex: Int,
    val textEn: String,
    val textKo: String? = null,
    val audioPath: String? = null,
    val sceneImagePath: String? = null,
)
