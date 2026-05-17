package site.smap.harubook.features.reader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import site.smap.harubook.core.models.VocabularyEntry

class VocabHighlightTest {
    @Test
    fun tokenizeSplitsWordsFromSeparators() {
        val tokens = tokenizePassage("The fox said, \"It's brave.\"")
        val words = tokens.filter { it.isWord }.map { it.text }
        assertEquals(listOf("The", "fox", "said", "It's", "brave"), words)
    }

    @Test
    fun tokenizePreservesPunctuationInBetween() {
        val tokens = tokenizePassage("hi, world!")
        val joined = tokens.joinToString("") { it.text }
        assertEquals("hi, world!", joined)
    }

    @Test
    fun tokenizeKeepsHyphenInsideWord() {
        val tokens = tokenizePassage("self-made man")
        val words = tokens.filter { it.isWord }.map { it.text }
        assertEquals(listOf("self-made", "man"), words)
    }

    @Test
    fun buildVocabMapKeepsFirstEntryAndUsesLowercaseKey() {
        val entries = listOf(
            VocabularyEntry("Brave", "용감한"),
            VocabularyEntry("brave", "씩씩한"),
            VocabularyEntry("Moon", "달"),
        )
        val map = buildVocabMap(entries)
        assertEquals(2, map.size)
        assertEquals("용감한", map["brave"]?.meaning)
        assertEquals("달", map["moon"]?.meaning)
    }

    @Test
    fun buildVocabMapSkipsBlankWords() {
        val entries = listOf(VocabularyEntry("   ", "x"), VocabularyEntry("ok", "확인"))
        val map = buildVocabMap(entries)
        assertEquals(1, map.size)
        assertTrue("ok" in map)
    }
}
