package site.smap.harubook.core.models

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.decodeFromJsonElement

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

/** 결말 분기 한 페이지. 웹 `schema.ts` `EndingPassage` 미러. UI는 이번 범위 밖 — 디코딩만 보존. */
@Serializable
data class EndingPassage(
    val en: String = "",
    val ko: String = "",
)

/** 픽션 결말 분기 A/B. 웹 `schema.ts` `AlternateEnding` 미러. */
@Serializable
data class AlternateEnding(
    val labelA: String = "",
    val labelB: String = "",
    val passagesA: List<EndingPassage> = emptyList(),
    val passagesB: List<EndingPassage> = emptyList(),
)

/** 논픽션 재미사실. 웹 `schema.ts` `FunFact` 미러. title=영문 헤드라인, body=한국어 한 문장. */
@Serializable
data class FunFact(
    val title: String = "",
    val body: String = "",
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
    /** `"fiction"` / `"non_fiction"`. null=레거시 행이며 fiction으로 해석. */
    val genre: String? = null,
    /** 결말 분기. 이번 범위는 디코딩·데이터 보존만. UI/페이지 가변은 다음 단계. */
    @Serializable(with = AlternateEndingFlexibleSerializer::class)
    val alternateEnding: AlternateEnding? = null,
    @Serializable(with = StringListFlexibleSerializer::class)
    val endingAudioPathsA: List<String>? = null,
    @Serializable(with = StringListFlexibleSerializer::class)
    val endingAudioPathsB: List<String>? = null,
    @Serializable(with = FunFactsFlexibleSerializer::class)
    val funFacts: List<FunFact>? = null,
    /** ISO8601 문자열. 백엔드 기본 Date 직렬화 결과(`2026-04-22T14:21:26.000Z`). */
    val flaggedAt: String? = null,
    val createdAt: String? = null,
) {
    val isFlagged: Boolean get() = !flaggedAt.isNullOrEmpty()

    /** 레거시(null)와 명시 fiction은 픽션. funFacts 노출은 논픽션만. */
    val isNonFiction: Boolean get() = genre == "non_fiction"

    /** 논픽션 + 비어 있지 않은 funFacts. 그 외는 빈 리스트 — Reader가 섹션을 숨긴다. */
    fun displayFunFacts(): List<FunFact> {
        if (!isNonFiction) return emptyList()
        return funFacts.orEmpty().filter { it.title.isNotBlank() || it.body.isNotBlank() }
    }
}

@Serializable
data class BooksResponse(val books: List<Book>)

@Serializable
data class BookDetail(val book: Book, val passages: List<Passage>)

/**
 * JSON 객체/배열뿐 아니라 레거시 typeCast 사고처럼 문자열로 감싼 JSON도 받아
 * 해당 필드만 nil로 강등한다. 필드 하나가 깨져도 Book 전체 디코딩이 실패하지 않게.
 */
internal abstract class LenientNullableSerializer<T>(
    private val dataSerializer: KSerializer<T>,
) : KSerializer<T?> {
    override val descriptor: SerialDescriptor = dataSerializer.descriptor

    override fun deserialize(decoder: Decoder): T? {
        val jsonDecoder = decoder as? JsonDecoder ?: return runCatching {
            dataSerializer.deserialize(decoder)
        }.getOrNull()
        val element = jsonDecoder.decodeJsonElement()
        if (element is JsonNull) return null
        val json = jsonDecoder.json
        return when {
            element is JsonPrimitive && element.isString ->
                runCatching { json.decodeFromString(dataSerializer, element.content) }.getOrNull()
            else ->
                runCatching { json.decodeFromJsonElement(dataSerializer, element) }.getOrNull()
        }
    }

    override fun serialize(encoder: Encoder, value: T?) {
        if (value == null) encoder.encodeNull() else dataSerializer.serialize(encoder, value)
    }
}

internal object AlternateEndingFlexibleSerializer :
    LenientNullableSerializer<AlternateEnding>(AlternateEnding.serializer())

internal object FunFactsFlexibleSerializer :
    LenientNullableSerializer<List<FunFact>>(ListSerializer(FunFact.serializer()))

internal object StringListFlexibleSerializer :
    LenientNullableSerializer<List<String>>(ListSerializer(String.serializer()))
