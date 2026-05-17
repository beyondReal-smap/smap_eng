package site.smap.harubook.core.srs

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import site.smap.harubook.core.networking.ApiClient
import java.util.Calendar

/**
 * Leitner-style SRS — iOS [SrsStore](apps/ios/HaruBook/Core/SRS/SrsStore.swift) 패리티.
 *
 * 평가 2단계: again(level=0, due=+5분) / good(level+1, max 3, 7일).
 * 저장: SharedPreferences(MODE_PRIVATE) — 단말 단위. iOS UserDefaults 패리티.
 */
@Serializable
data class SrsItem(
    val level: Int,
    val dueAtMs: Double,
    val lastGradedAtMs: Double,
)

enum class SrsGrade(val raw: String) { Again("again"), Good("good") }

enum class VocabCardState { New, Relearning, Learning, Mastered }

fun srsNormalizeKey(word: String): String {
    val trimmed = word.trim().lowercase()
    val punctuation = setOf('.', ',', '!', '?', ';', ':', '"', '\'')
    return buildString { trimmed.forEach { ch -> if (ch !in punctuation) append(ch) } }
}

class SrsStore(
    private val profileId: Int,
    private val prefs: SharedPreferences,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
    private val now: () -> Double = { System.currentTimeMillis().toDouble() },
) {
    companion object {
        const val MAX_LEVEL = 3
        val INTERVAL_MS: List<Double> = listOf(
            5.0 * 60 * 1000,
            24.0 * 60 * 60 * 1000,
            3.0 * 24 * 60 * 60 * 1000,
            7.0 * 24 * 60 * 60 * 1000,
        )

        fun create(context: Context, profileId: Int): SrsStore {
            val prefs = context.applicationContext.getSharedPreferences("harubook_srs", Context.MODE_PRIVATE)
            return SrsStore(profileId = profileId, prefs = prefs)
        }
    }

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val mapSerializer = MapSerializer(String.serializer(), SrsItem.serializer())
    private val storageKey = "srs.profile.$profileId"
    private var items: MutableMap<String, SrsItem> = load()

    private fun load(): MutableMap<String, SrsItem> {
        val raw = prefs.getString(storageKey, null) ?: return mutableMapOf()
        return runCatching { json.decodeFromString(mapSerializer, raw).toMutableMap() }
            .getOrDefault(mutableMapOf())
    }

    private fun persist() {
        prefs.edit().putString(storageKey, json.encodeToString(mapSerializer, items)).apply()
    }

    fun grade(word: String, grade: SrsGrade): SrsItem {
        val key = srsNormalizeKey(word)
        val prev = items[key] ?: SrsItem(level = 0, dueAtMs = 0.0, lastGradedAtMs = 0.0)
        val nowMs = now()
        val level = when (grade) {
            SrsGrade.Again -> 0
            SrsGrade.Good -> minOf(MAX_LEVEL, prev.level + 1)
        }
        val next = SrsItem(level = level, dueAtMs = nowMs + INTERVAL_MS[level], lastGradedAtMs = nowMs)
        items[key] = next
        persist()
        scope.launch { postGrade(word, grade) }
        return next
    }

    fun item(word: String): SrsItem? = items[srsNormalizeKey(word)]

    fun isUnknown(word: String): Boolean {
        val it = item(word) ?: return false
        return it.level == 0 && it.lastGradedAtMs > 0
    }

    fun isDue(word: String, nowMs: Double = now()): Boolean {
        val it = item(word) ?: return true
        return it.dueAtMs <= nowMs
    }

    fun hasHistory(word: String): Boolean {
        val it = item(word) ?: return false
        return it.lastGradedAtMs > 0
    }

    fun isMastered(word: String): Boolean {
        val it = item(word) ?: return false
        return it.level >= MAX_LEVEL
    }

    fun cardState(word: String): VocabCardState {
        val it = item(word) ?: return VocabCardState.New
        if (it.level >= MAX_LEVEL) return VocabCardState.Mastered
        if (it.level == 0) return VocabCardState.Relearning
        return VocabCardState.Learning
    }

    fun isNew(word: String): Boolean = item(word) == null

    fun gradedTodayCount(): Int {
        val startMs = startOfTodayMs()
        return items.values.count { it.lastGradedAtMs >= startMs }
    }

    private fun startOfTodayMs(): Double {
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        return cal.timeInMillis.toDouble()
    }

    suspend fun hydrateFromServer() {
        try {
            val response: VocabProgressResponse = ApiClient.get(
                path = "/api/vocab/progress",
                query = mapOf("profileId" to profileId.toString()),
            )
            for (row in response.progress) {
                val cur = items[row.wordKey]
                if (cur == null || row.lastGradedAtMs > cur.lastGradedAtMs) {
                    items[row.wordKey] = SrsItem(
                        level = row.level,
                        dueAtMs = row.dueAtMs,
                        lastGradedAtMs = row.lastGradedAtMs,
                    )
                }
            }
            persist()
        } catch (_: Throwable) {
            // 오프라인/실패 — 다음 호출에 재시도.
        }
    }

    private suspend fun postGrade(word: String, grade: SrsGrade) {
        try {
            ApiClient.post<EmptyResponse>(
                path = "/api/vocab/grade",
                body = GradeRequest(profileId = profileId, word = word, grade = grade.raw),
            )
        } catch (_: Throwable) {
            // 미러 실패 — 사용자 흐름 미차단.
        }
    }
}

@Serializable
private data class GradeRequest(val profileId: Int, val word: String, val grade: String)

@Serializable
private class EmptyResponse

@Serializable
internal data class VocabProgressResponse(val progress: List<VocabProgressRow>)

@Serializable
internal data class VocabProgressRow(
    val wordKey: String,
    val level: Int,
    val dueAtMs: Double,
    val lastGradedAtMs: Double,
)
