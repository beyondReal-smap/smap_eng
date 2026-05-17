package site.smap.harubook.core.srs

import android.content.SharedPreferences
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SrsStoreTest {
    @Test
    fun normalizeKeyLowersTrimsAndStripsPunctuation() {
        assertEquals("brave", srsNormalizeKey("  Brave!  "))
        assertEquals("its", srsNormalizeKey("\"It's\""))
        assertEquals("moon", srsNormalizeKey("Moon."))
    }

    @Test
    fun gradeAgainResetsLevelToZeroDueIn5Min() {
        val store = SrsStore(profileId = 1, prefs = InMemoryPrefs(), now = { 1_000_000.0 })
        val item = store.grade("apple", SrsGrade.Again)
        assertEquals(0, item.level)
        assertEquals(1_000_000.0 + 5 * 60 * 1000, item.dueAtMs, 0.001)
    }

    @Test
    fun gradeGoodIncrementsLevelUpToMax() {
        val store = SrsStore(profileId = 1, prefs = InMemoryPrefs(), now = { 0.0 })
        repeat(SrsStore.MAX_LEVEL + 2) { store.grade("apple", SrsGrade.Good) }
        val it = store.item("apple")!!
        assertEquals(SrsStore.MAX_LEVEL, it.level)
    }

    @Test
    fun isUnknownTrueOnlyAfterAgainEvaluation() {
        val store = SrsStore(profileId = 1, prefs = InMemoryPrefs(), now = { 1.0 })
        assertFalse(store.isUnknown("apple"))
        store.grade("apple", SrsGrade.Again)
        assertTrue(store.isUnknown("apple"))
    }

    @Test
    fun cardStateNewWhenNoHistory() {
        val store = SrsStore(profileId = 1, prefs = InMemoryPrefs())
        assertEquals(VocabCardState.New, store.cardState("anything"))
    }

    @Test
    fun cardStateMasteredAtMaxLevel() {
        val store = SrsStore(profileId = 1, prefs = InMemoryPrefs(), now = { 0.0 })
        repeat(SrsStore.MAX_LEVEL) { store.grade("apple", SrsGrade.Good) }
        assertEquals(VocabCardState.Mastered, store.cardState("apple"))
    }
}

private class InMemoryPrefs : SharedPreferences {
    private val store = mutableMapOf<String, String?>()
    override fun getString(key: String, defValue: String?): String? = store[key] ?: defValue
    override fun edit(): SharedPreferences.Editor = object : SharedPreferences.Editor {
        private val pending = mutableMapOf<String, String?>()
        private var clear = false
        private val removed = mutableSetOf<String>()
        override fun putString(key: String, value: String?): SharedPreferences.Editor { pending[key] = value; return this }
        override fun putStringSet(key: String?, values: MutableSet<String>?): SharedPreferences.Editor = this
        override fun putInt(key: String?, value: Int): SharedPreferences.Editor = this
        override fun putLong(key: String?, value: Long): SharedPreferences.Editor = this
        override fun putFloat(key: String?, value: Float): SharedPreferences.Editor = this
        override fun putBoolean(key: String?, value: Boolean): SharedPreferences.Editor = this
        override fun remove(key: String): SharedPreferences.Editor { removed += key; return this }
        override fun clear(): SharedPreferences.Editor { clear = true; return this }
        override fun commit(): Boolean { apply(); return true }
        override fun apply() {
            if (clear) store.clear()
            for (k in removed) store.remove(k)
            for ((k, v) in pending) store[k] = v
        }
    }
    override fun getAll(): MutableMap<String, *> = store.toMutableMap()
    override fun getStringSet(key: String?, defValues: MutableSet<String>?): MutableSet<String>? = null
    override fun getInt(key: String?, defValue: Int): Int = defValue
    override fun getLong(key: String?, defValue: Long): Long = defValue
    override fun getFloat(key: String?, defValue: Float): Float = defValue
    override fun getBoolean(key: String?, defValue: Boolean): Boolean = defValue
    override fun contains(key: String?): Boolean = store.containsKey(key)
    override fun registerOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) {}
    override fun unregisterOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) {}
}
