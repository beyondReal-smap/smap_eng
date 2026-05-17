package site.smap.harubook.features.reader

import site.smap.harubook.core.models.VocabularyEntry

/**
 * 단어 popover 토큰화 헬퍼. iOS `PassageView.swift` 의 buildVocabMap / tokenize 미러.
 * Compose runtime 의존성 없음 → pure 단위 테스트 가능.
 */

data class PassageToken(val text: String, val isWord: Boolean)

/** 본문을 단어/공백/구두점 토큰으로 분해. 알파벳·작은따옴표·하이픈은 한 단어로 묶는다. */
fun tokenizePassage(text: String): List<PassageToken> {
    val result = mutableListOf<PassageToken>()
    val current = StringBuilder()
    var inWord = false

    fun flush() {
        if (current.isEmpty()) return
        result += PassageToken(text = current.toString(), isWord = inWord)
        current.clear()
    }

    for (ch in text) {
        val isAlpha = ch.isLetter() || ch == '\'' || ch == '-'
        if (isAlpha) {
            if (!inWord) { flush(); inWord = true }
        } else {
            if (inWord) { flush(); inWord = false }
        }
        current.append(ch)
    }
    flush()
    return result
}

/** normalize(word) → entry. 중복은 첫 항목 유지. iOS buildVocabMap 동등. */
fun buildVocabMap(entries: List<VocabularyEntry>): Map<String, VocabularyEntry> {
    val map = LinkedHashMap<String, VocabularyEntry>()
    for (entry in entries) {
        val key = normalizeVocabKey(entry.word)
        if (key.isEmpty() || map.containsKey(key)) continue
        map[key] = entry
    }
    return map
}

/** vocab 매칭용 단어 정규화 — 양끝 공백 제거 + 소문자. */
fun normalizeVocabKey(word: String): String = word.trim().lowercase()
