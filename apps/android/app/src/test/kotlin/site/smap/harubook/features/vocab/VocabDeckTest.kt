package site.smap.harubook.features.vocab

import org.junit.Assert.assertEquals
import org.junit.Test
import site.smap.harubook.core.models.VocabEntry

class VocabDeckTest {
    @Test
    fun dedupeUsesWordAndMeaning() {
        val entries = listOf(
            entry("Brave", "용감한"),
            entry("brave", "용감한"),
            entry("brave", "씩씩한"),
            entry("moon", "달"),
        )
        val deduped = dedupeVocabEntries(entries)
        assertEquals(listOf("Brave", "brave", "moon"), deduped.map { it.word })
        assertEquals(listOf("용감한", "씩씩한", "달"), deduped.map { it.meaning })
    }

    @Test
    fun filterUnknownUsesNormalizedWords() {
        val entries = listOf(entry("Brave", "용감한"), entry("moon", "달"))
        val unknown = filterUnknownEntries(entries, setOf("brave"))
        assertEquals(listOf("Brave"), unknown.map { it.word })
    }

    private fun entry(word: String, meaning: String) =
        VocabEntry(word = word, meaning = meaning, bookId = 1, bookTitle = "Book")
}
