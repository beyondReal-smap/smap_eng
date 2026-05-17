package site.smap.harubook.features.vocab

import site.smap.harubook.core.models.VocabEntry

fun normalizeVocabWord(word: String): String = word.trim().lowercase()

fun dedupeVocabEntries(entries: List<VocabEntry>): List<VocabEntry> {
    val seen = mutableSetOf<String>()
    return entries.filter { entry ->
        val key = "${normalizeVocabWord(entry.word)}::${entry.meaning.trim()}"
        seen.add(key)
    }
}

fun filterUnknownEntries(
    entries: List<VocabEntry>,
    unknownWords: Set<String>,
): List<VocabEntry> {
    val normalized = unknownWords.mapTo(mutableSetOf()) { normalizeVocabWord(it) }
    return entries.filter { normalizeVocabWord(it.word) in normalized }
}
