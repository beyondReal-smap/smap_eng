# Android iOS Core Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Android's iOS-core-parity MVP with a 4-tab home: bookshelf, stats, vocab, and settings.

**Architecture:** Keep the current Kotlin/Jetpack Compose app and existing bookshelf/reader/quiz/create-book routes. Add a `MainTabScaffold` after profile selection, keep deep navigation inside the bookshelf tab, and add focused stats, vocab, and settings feature packages. Put reusable calculation logic in pure Kotlin helpers so it can be tested without Android runtime.

**Tech Stack:** Kotlin 2.0, Jetpack Compose Material3, AndroidX Navigation Compose, Ktor client, kotlinx.serialization, JUnit 4, Gradle wrapper in `apps/android`.

---

## File Structure

Create:

- `apps/android/app/src/main/java/site/smap/harubook/core/models/LearningSummary.kt` - Android serialization models for `/api/learning-summary`.
- `apps/android/app/src/main/java/site/smap/harubook/core/models/BookProgressStat.kt` - Android serialization models for `/api/books` stats payload.
- `apps/android/app/src/main/java/site/smap/harubook/core/models/VocabEntry.kt` - Android serialization models for `/api/vocab`.
- `apps/android/app/src/main/java/site/smap/harubook/features/home/MainTabScaffold.kt` - Bottom navigation and tab routing after profile selection.
- `apps/android/app/src/main/java/site/smap/harubook/features/stats/StatsMetrics.kt` - Pure stats and month-grid helpers.
- `apps/android/app/src/main/java/site/smap/harubook/features/stats/StatsViewModel.kt` - API loading state for the stats tab.
- `apps/android/app/src/main/java/site/smap/harubook/features/stats/StatsDashboardScreen.kt` - Stats tab Compose UI.
- `apps/android/app/src/main/java/site/smap/harubook/features/vocab/VocabDeck.kt` - Pure vocab de-duplication and filtering helpers.
- `apps/android/app/src/main/java/site/smap/harubook/features/vocab/VocabViewModel.kt` - API loading state for the vocab tab.
- `apps/android/app/src/main/java/site/smap/harubook/features/vocab/VocabDeckScreen.kt` - Vocab tab Compose UI.
- `apps/android/app/src/main/java/site/smap/harubook/features/settings/SettingsScreen.kt` - MVP settings UI.
- `apps/android/app/src/test/kotlin/site/smap/harubook/core/models/MobileModelDecodingTest.kt` - Serialization coverage for new models.
- `apps/android/app/src/test/kotlin/site/smap/harubook/features/stats/StatsMetricsTest.kt` - Pure stats helper tests.
- `apps/android/app/src/test/kotlin/site/smap/harubook/features/vocab/VocabDeckTest.kt` - Pure vocab helper tests.

Modify:

- `apps/android/app/src/main/java/site/smap/harubook/features/home/HomeRouter.kt` - Route selected profile into `MainTabScaffold`.
- `apps/android/app/src/main/res/values/strings.xml` - Add labels for tabs and new screens.

Do not modify:

- Backend API routes.
- Existing iOS files.
- Existing auth providers, Store/IAP, Parents, Push, account deletion.

---

### Task 1: Add Mobile API Models

**Files:**
- Create: `apps/android/app/src/main/java/site/smap/harubook/core/models/LearningSummary.kt`
- Create: `apps/android/app/src/main/java/site/smap/harubook/core/models/BookProgressStat.kt`
- Create: `apps/android/app/src/main/java/site/smap/harubook/core/models/VocabEntry.kt`
- Test: `apps/android/app/src/test/kotlin/site/smap/harubook/core/models/MobileModelDecodingTest.kt`

- [ ] **Step 1: Write the failing decoding tests**

```kotlin
package site.smap.harubook.core.models

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class MobileModelDecodingTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun decodesLearningSummaryResponse() {
        val payload = """
            {
              "summary": {
                "totalBooksRead": 3,
                "totalFinishedSessions": 4,
                "totalPerfectScores": 2,
                "averageAccuracy": 0.8,
                "lastFinishedAtUnix": 1710000000,
                "continueBookId": 11,
                "activeDaysThisWeek": ["2026-05-11"],
                "activeDaysThisMonth": ["2026-05-01", "2026-05-11"],
                "thisMonth": "2026-05"
              }
            }
        """.trimIndent()

        val decoded = json.decodeFromString<LearningSummaryResponse>(payload)

        assertEquals(3, decoded.summary.totalBooksRead)
        assertEquals(4, decoded.summary.totalFinishedSessions)
        assertEquals(2, decoded.summary.totalPerfectScores)
        assertEquals(0.8, decoded.summary.averageAccuracy!!, 0.0001)
        assertEquals(1710000000L, decoded.summary.lastFinishedAtUnix)
        assertEquals(11, decoded.summary.continueBookId)
        assertEquals(listOf("2026-05-11"), decoded.summary.activeDaysThisWeek)
        assertEquals(listOf("2026-05-01", "2026-05-11"), decoded.summary.activeDaysThisMonth)
        assertEquals("2026-05", decoded.summary.thisMonth)
    }

    @Test
    fun decodesNullableSummaryFields() {
        val payload = """
            {
              "summary": {
                "totalBooksRead": 0,
                "totalFinishedSessions": 0,
                "totalPerfectScores": 0,
                "averageAccuracy": null,
                "lastFinishedAtUnix": null,
                "continueBookId": null,
                "activeDaysThisWeek": [],
                "activeDaysThisMonth": [],
                "thisMonth": "2026-05"
              }
            }
        """.trimIndent()

        val decoded = json.decodeFromString<LearningSummaryResponse>(payload)

        assertNull(decoded.summary.averageAccuracy)
        assertNull(decoded.summary.lastFinishedAtUnix)
        assertNull(decoded.summary.continueBookId)
    }

    @Test
    fun decodesBooksWithStatsResponse() {
        val payload = """
            {
              "books": [
                {
                  "id": 9,
                  "profileId": 1,
                  "title": "Moon Cake",
                  "age": 7,
                  "cefr": "A1",
                  "topic": "space",
                  "coverImagePath": null,
                  "flaggedAt": null,
                  "createdAt": 1710000100
                }
              ],
              "stats": {
                "9": {
                  "progressRatio": 1.0,
                  "quizScore": 5,
                  "finishedAtUnix": 1710000200,
                  "startedAtUnix": 1710000100
                }
              }
            }
        """.trimIndent()

        val decoded = json.decodeFromString<BooksWithStatsResponse>(payload)

        assertEquals("Moon Cake", decoded.books.first().title)
        assertEquals(1.0, decoded.stats!!.getValue("9").progressRatio, 0.0001)
        assertEquals(5, decoded.stats!!.getValue("9").quizScore)
        assertEquals(1710000200L, decoded.stats!!.getValue("9").finishedAtUnix)
    }

    @Test
    fun decodesVocabResponse() {
        val payload = """
            {
              "entries": [
                {
                  "word": "brave",
                  "meaning": "용감한",
                  "bookId": 9,
                  "bookTitle": "Moon Cake"
                }
              ]
            }
        """.trimIndent()

        val decoded = json.decodeFromString<VocabResponse>(payload)

        assertEquals("brave", decoded.entries.first().word)
        assertEquals("용감한", decoded.entries.first().meaning)
        assertEquals(9, decoded.entries.first().bookId)
        assertEquals("Moon Cake", decoded.entries.first().bookTitle)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:testDebugUnitTest --tests 'site.smap.harubook.core.models.MobileModelDecodingTest'
```

Expected: FAIL because `LearningSummaryResponse`, `BooksWithStatsResponse`, and `VocabResponse` are not defined.

- [ ] **Step 3: Add `LearningSummary.kt`**

```kotlin
package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class LearningSummary(
    val totalBooksRead: Int,
    val totalFinishedSessions: Int,
    val totalPerfectScores: Int,
    val averageAccuracy: Double? = null,
    val lastFinishedAtUnix: Long? = null,
    val continueBookId: Int? = null,
    val activeDaysThisWeek: List<String> = emptyList(),
    val activeDaysThisMonth: List<String> = emptyList(),
    val thisMonth: String,
)

@Serializable
data class LearningSummaryResponse(val summary: LearningSummary)
```

- [ ] **Step 4: Add `BookProgressStat.kt`**

```kotlin
package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class BookProgressStat(
    val progressRatio: Double,
    val quizScore: Int? = null,
    val finishedAtUnix: Long? = null,
    val startedAtUnix: Long,
)

@Serializable
data class BooksWithStatsResponse(
    val books: List<Book>,
    val stats: Map<String, BookProgressStat>? = null,
)
```

- [ ] **Step 5: Add `VocabEntry.kt`**

```kotlin
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
```

- [ ] **Step 6: Run model tests**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:testDebugUnitTest --tests 'site.smap.harubook.core.models.MobileModelDecodingTest'
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/android/app/src/main/java/site/smap/harubook/core/models/LearningSummary.kt \
  apps/android/app/src/main/java/site/smap/harubook/core/models/BookProgressStat.kt \
  apps/android/app/src/main/java/site/smap/harubook/core/models/VocabEntry.kt \
  apps/android/app/src/test/kotlin/site/smap/harubook/core/models/MobileModelDecodingTest.kt
git commit -m "feat(android): add iOS parity API models"
```

---

### Task 2: Add Stats Metrics Helpers

**Files:**
- Create: `apps/android/app/src/main/java/site/smap/harubook/features/stats/StatsMetrics.kt`
- Test: `apps/android/app/src/test/kotlin/site/smap/harubook/features/stats/StatsMetricsTest.kt`

- [ ] **Step 1: Write failing tests for level stats, vocab breakdown, and month grid**

```kotlin
package site.smap.harubook.features.stats

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import site.smap.harubook.core.models.Book
import site.smap.harubook.core.models.BookProgressStat
import site.smap.harubook.core.models.CefrLevel
import site.smap.harubook.core.models.VocabEntry

class StatsMetricsTest {
    @Test
    fun levelStatsReturnsCountsFinishedAndAverageAccuracy() {
        val books = listOf(
            book(id = 1, cefr = CefrLevel.A1),
            book(id = 2, cefr = CefrLevel.A1),
            book(id = 3, cefr = CefrLevel.A2),
        )
        val stats = mapOf(
            1 to BookProgressStat(progressRatio = 1.0, quizScore = 5, finishedAtUnix = 10, startedAtUnix = 1),
            2 to BookProgressStat(progressRatio = 0.5, quizScore = 3, finishedAtUnix = null, startedAtUnix = 2),
            3 to BookProgressStat(progressRatio = 1.0, quizScore = null, finishedAtUnix = 12, startedAtUnix = 3),
        )

        val rows = levelStats(books, stats)

        val a1 = rows.first { it.level == CefrLevel.A1 }
        val a2 = rows.first { it.level == CefrLevel.A2 }
        val b1 = rows.first { it.level == CefrLevel.B1 }
        assertEquals(2, a1.count)
        assertEquals(1, a1.finished)
        assertEquals(0.8, a1.averageAccuracy!!, 0.0001)
        assertEquals(1, a2.count)
        assertEquals(1, a2.finished)
        assertEquals(null, a2.averageAccuracy)
        assertEquals(0, b1.count)
    }

    @Test
    fun vocabBreakdownDedupesWordsCaseInsensitively() {
        val entries = listOf(
            vocab("Brave", "용감한"),
            vocab("brave", "용감한"),
            vocab("Moon", "달"),
            vocab("kind", "친절한"),
        )

        val breakdown = vocabBreakdown(
            entries = entries,
            unknownWords = setOf("moon"),
            masteringWords = setOf("kind"),
        )

        assertEquals(3, breakdown.total)
        assertEquals(1, breakdown.fresh)
        assertEquals(1, breakdown.unknown)
        assertEquals(1, breakdown.mastering)
    }

    @Test
    fun monthGridBuildsMay2026WithFridayFirstDay() {
        val grid = buildMonthGrid("2026-05", setOf("2026-05-01", "2026-05-16"))

        assertEquals(36, grid.size)
        assertEquals(null, grid[0].day)
        assertEquals(null, grid[4].day)
        assertEquals(1, grid[5].day)
        assertTrue(grid[5].active)
        assertEquals(16, grid[20].day)
        assertTrue(grid[20].active)
        assertEquals(31, grid.last().day)
        assertFalse(grid.last().active)
    }

    private fun book(id: Int, cefr: CefrLevel): Book =
        Book(id = id, profileId = 1, title = "Book $id", age = 7, cefr = cefr)

    private fun vocab(word: String, meaning: String): VocabEntry =
        VocabEntry(word = word, meaning = meaning, bookId = 1, bookTitle = "Book")
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:testDebugUnitTest --tests 'site.smap.harubook.features.stats.StatsMetricsTest'
```

Expected: FAIL because `levelStats`, `vocabBreakdown`, and `buildMonthGrid` are not defined.

- [ ] **Step 3: Add `StatsMetrics.kt`**

```kotlin
package site.smap.harubook.features.stats

import java.time.YearMonth
import site.smap.harubook.core.models.Book
import site.smap.harubook.core.models.BookProgressStat
import site.smap.harubook.core.models.CefrLevel
import site.smap.harubook.core.models.VocabEntry

data class LevelStatRow(
    val level: CefrLevel,
    val count: Int,
    val finished: Int,
    val averageAccuracy: Double?,
)

data class VocabBreakdown(
    val total: Int,
    val fresh: Int,
    val unknown: Int,
    val mastering: Int,
)

data class MonthGridCell(
    val day: Int?,
    val active: Boolean,
)

fun levelStats(
    books: List<Book>,
    stats: Map<Int, BookProgressStat>,
): List<LevelStatRow> =
    CefrLevel.entries.map { level ->
        val levelBooks = books.filter { it.cefr == level }
        val levelStats = levelBooks.mapNotNull { stats[it.id] }
        val scores = levelStats.mapNotNull { it.quizScore?.let { score -> score.toDouble() / 5.0 } }
        LevelStatRow(
            level = level,
            count = levelBooks.size,
            finished = levelStats.count { it.finishedAtUnix != null },
            averageAccuracy = scores.takeIf { it.isNotEmpty() }?.average(),
        )
    }

fun vocabBreakdown(
    entries: List<VocabEntry>,
    unknownWords: Set<String> = emptySet(),
    masteringWords: Set<String> = emptySet(),
): VocabBreakdown {
    val uniqueWords = entries
        .map { it.word.trim().lowercase() }
        .filter { it.isNotEmpty() }
        .distinct()

    val unknown = uniqueWords.count { it in unknownWords }
    val mastering = uniqueWords.count { it in masteringWords }
    return VocabBreakdown(
        total = uniqueWords.size,
        fresh = uniqueWords.size - unknown - mastering,
        unknown = unknown,
        mastering = mastering,
    )
}

fun buildMonthGrid(
    thisMonth: String,
    activeDays: Set<String>,
): List<MonthGridCell> {
    val month = YearMonth.parse(thisMonth)
    val leadingBlanks = month.atDay(1).dayOfWeek.value % 7
    val cells = mutableListOf<MonthGridCell>()
    repeat(leadingBlanks) {
        cells += MonthGridCell(day = null, active = false)
    }
    for (day in 1..month.lengthOfMonth()) {
        val key = "%04d-%02d-%02d".format(month.year, month.monthValue, day)
        cells += MonthGridCell(day = day, active = key in activeDays)
    }
    return cells
}
```

- [ ] **Step 4: Run stats helper tests**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:testDebugUnitTest --tests 'site.smap.harubook.features.stats.StatsMetricsTest'
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/android/app/src/main/java/site/smap/harubook/features/stats/StatsMetrics.kt \
  apps/android/app/src/test/kotlin/site/smap/harubook/features/stats/StatsMetricsTest.kt
git commit -m "feat(android): add stats metric helpers"
```

---

### Task 3: Add Vocab Deck Helpers

**Files:**
- Create: `apps/android/app/src/main/java/site/smap/harubook/features/vocab/VocabDeck.kt`
- Test: `apps/android/app/src/test/kotlin/site/smap/harubook/features/vocab/VocabDeckTest.kt`

- [ ] **Step 1: Write failing vocab helper tests**

```kotlin
package site.smap.harubook.features.vocab

import org.junit.Assert.assertEquals
import org.junit.Test
import site.smap.harubook.core.models.VocabEntry

class VocabDeckTest {
    @Test
    fun dedupeEntriesUsesWordAndMeaning() {
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
    fun filterUnknownEntriesUsesNormalizedWords() {
        val entries = listOf(entry("Brave", "용감한"), entry("moon", "달"))

        val unknown = filterUnknownEntries(entries, setOf("brave"))

        assertEquals(listOf("Brave"), unknown.map { it.word })
    }

    private fun entry(word: String, meaning: String): VocabEntry =
        VocabEntry(word = word, meaning = meaning, bookId = 1, bookTitle = "Book")
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:testDebugUnitTest --tests 'site.smap.harubook.features.vocab.VocabDeckTest'
```

Expected: FAIL because `dedupeVocabEntries` and `filterUnknownEntries` are not defined.

- [ ] **Step 3: Add `VocabDeck.kt`**

```kotlin
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
```

- [ ] **Step 4: Run vocab helper tests**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:testDebugUnitTest --tests 'site.smap.harubook.features.vocab.VocabDeckTest'
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/android/app/src/main/java/site/smap/harubook/features/vocab/VocabDeck.kt \
  apps/android/app/src/test/kotlin/site/smap/harubook/features/vocab/VocabDeckTest.kt
git commit -m "feat(android): add vocab deck helpers"
```

---

### Task 4: Add Main Tab Scaffold

**Files:**
- Create: `apps/android/app/src/main/java/site/smap/harubook/features/home/MainTabScaffold.kt`
- Modify: `apps/android/app/src/main/java/site/smap/harubook/features/home/HomeRouter.kt`
- Modify: `apps/android/app/src/main/res/values/strings.xml`

- [ ] **Step 1: Add tab strings**

Add these entries inside `<resources>` in `apps/android/app/src/main/res/values/strings.xml`:

```xml
<string name="tab_bookshelf">책장</string>
<string name="tab_stats">통계</string>
<string name="tab_vocab">단어장</string>
<string name="tab_settings">설정</string>
<string name="settings_title">설정</string>
<string name="stats_title">학습 통계</string>
<string name="vocab_title">단어장</string>
```

- [ ] **Step 2: Add `MainTabScaffold.kt` with final tab destinations**

```kotlin
package site.smap.harubook.features.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import site.smap.harubook.R
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.features.settings.SettingsScreen
import site.smap.harubook.features.stats.StatsDashboardScreen
import site.smap.harubook.features.vocab.VocabDeckScreen

private enum class HomeTab(
    val labelRes: Int,
    val icon: ImageVector,
) {
    Bookshelf(R.string.tab_bookshelf, Icons.AutoMirrored.Filled.MenuBook),
    Stats(R.string.tab_stats, Icons.Filled.BarChart),
    Vocab(R.string.tab_vocab, Icons.Filled.Translate),
    Settings(R.string.tab_settings, Icons.Filled.Settings),
}

@Composable
fun MainTabScaffold(
    profileId: Int,
    onSwitchProfile: () -> Unit,
    bookshelfContent: @Composable () -> Unit,
) {
    var selectedTab by remember(profileId) { mutableStateOf(HomeTab.Bookshelf) }

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = SmapBackground) {
                HomeTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(stringResource(tab.labelRes)) },
                    )
                }
            }
        },
        containerColor = SmapBackground,
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(SmapBackground),
        ) {
            when (selectedTab) {
                HomeTab.Bookshelf -> bookshelfContent()
                HomeTab.Stats -> StatsDashboardScreen(profileId = profileId)
                HomeTab.Vocab -> VocabDeckScreen(profileId = profileId)
                HomeTab.Settings -> SettingsScreen(
                    onSwitchProfile = onSwitchProfile,
                    onSignOut = onSwitchProfile,
                )
            }
        }
    }
}
```

Keep the `bookshelfContent` parameter so the existing `NavHost` remains in `HomeRouter`.

- [ ] **Step 3: Modify `HomeRouter.kt` to use `MainTabScaffold`**

Replace the `composable(BOOKSHELF_ROUTE)` body with:

```kotlin
composable(BOOKSHELF_ROUTE) {
    val pid = selectedProfileId ?: return@composable
    MainTabScaffold(
        profileId = pid,
        onSwitchProfile = {
            selectedProfileId = null
            SessionPreferences.setLastProfileId(context, null)
            nav.navigate(PROFILE_PICKER_ROUTE) {
                popUpTo(BOOKSHELF_ROUTE) { inclusive = true }
            }
        },
        bookshelfContent = {
            BookshelfScreen(
                profileId = pid,
                onSwitchProfile = {
                    selectedProfileId = null
                    SessionPreferences.setLastProfileId(context, null)
                    nav.navigate(PROFILE_PICKER_ROUTE) {
                        popUpTo(BOOKSHELF_ROUTE) { inclusive = true }
                    }
                },
                onOpenBook = { bookId ->
                    nav.navigate("reader/$bookId")
                },
                onCreateBook = {
                    nav.navigate(CREATE_BOOK_ROUTE)
                },
            )
        },
    )
}
```

- [ ] **Step 4: Run compile to expose missing screens**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:compileDebugKotlin
```

Expected: FAIL because `SettingsScreen`, `StatsDashboardScreen`, and `VocabDeckScreen` are not defined yet.

- [ ] **Step 5: Hold commit until Task 5, 6, and 7 compile this scaffold**

Do not commit Task 4 alone if it does not compile. Commit the scaffold together after the stats, vocab, and settings target screens exist.

---

### Task 5: Add Stats ViewModel and Screen

**Files:**
- Create: `apps/android/app/src/main/java/site/smap/harubook/features/stats/StatsViewModel.kt`
- Create: `apps/android/app/src/main/java/site/smap/harubook/features/stats/StatsDashboardScreen.kt`

- [ ] **Step 1: Add `StatsViewModel.kt`**

```kotlin
package site.smap.harubook.features.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import site.smap.harubook.core.models.Book
import site.smap.harubook.core.models.BookProgressStat
import site.smap.harubook.core.models.BooksWithStatsResponse
import site.smap.harubook.core.models.LearningSummary
import site.smap.harubook.core.models.LearningSummaryResponse
import site.smap.harubook.core.models.VocabEntry
import site.smap.harubook.core.models.VocabResponse
import site.smap.harubook.core.networking.ApiClient

data class StatsUiState(
    val summary: LearningSummary? = null,
    val books: List<Book> = emptyList(),
    val stats: Map<Int, BookProgressStat> = emptyMap(),
    val vocab: List<VocabEntry> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

class StatsViewModel(private val profileId: Int) : ViewModel() {
    private val _state = MutableStateFlow(StatsUiState())
    val state: StateFlow<StatsUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val result = coroutineScope {
                    val summary = async {
                        ApiClient.get<LearningSummaryResponse>(
                            path = "/api/learning-summary",
                            query = mapOf("profileId" to profileId.toString()),
                        )
                    }
                    val books = async {
                        ApiClient.get<BooksWithStatsResponse>(
                            path = "/api/books",
                            query = mapOf("profileId" to profileId.toString()),
                        )
                    }
                    val vocab = async {
                        ApiClient.get<VocabResponse>(
                            path = "/api/vocab",
                            query = mapOf("profileId" to profileId.toString()),
                        )
                    }
                    Triple(summary.await(), books.await(), vocab.await())
                }

                val (summaryResponse, booksResponse, vocabResponse) = result
                val parsedStats = booksResponse.stats.orEmpty().mapNotNull { (key, value) ->
                    key.toIntOrNull()?.let { it to value }
                }.toMap()
                _state.update {
                    it.copy(
                        summary = summaryResponse.summary,
                        books = booksResponse.books,
                        stats = parsedStats,
                        vocab = vocabResponse.entries,
                        isLoading = false,
                        error = null,
                    )
                }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "통계를 불러오지 못했어요.",
                    )
                }
            }
        }
    }
}
```

- [ ] **Step 2: Add `StatsDashboardScreen.kt`**

```kotlin
package site.smap.harubook.features.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.R
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

@Composable
fun StatsDashboardScreen(profileId: Int) {
    val viewModel: StatsViewModel = viewModel(
        key = "stats-$profileId",
        factory = remember(profileId) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return StatsViewModel(profileId) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()

    LaunchedEffect(profileId) { viewModel.load() }

    when {
        state.isLoading && state.summary == null -> CenteredStats { CircularProgressIndicator(color = SmapPrimary) }
        state.error != null && state.summary == null -> StatsError(message = state.error!!, onRetry = viewModel::load)
        state.summary == null -> StatsEmpty("아직 학습 기록이 없어요. 책을 한 권 읽고 다시 와 주세요.")
        else -> StatsContent(state)
    }
}

@Composable
private fun StatsContent(state: StatsUiState) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        item {
            Text(
                text = stringResource(R.string.stats_title),
                style = SmapHeadingStyle,
                color = SmapText,
                modifier = Modifier.padding(top = 20.dp),
            )
        }
        item {
            val summary = state.summary!!
            StatGrid(
                items = listOf(
                    "읽은 책" to "${summary.totalBooksRead}권",
                    "완독 세션" to "${summary.totalFinishedSessions}회",
                    "만점" to "${summary.totalPerfectScores}회",
                    "평균 정답률" to "${((summary.averageAccuracy ?: 0.0) * 100).toInt()}%",
                ),
            )
        }
        item {
            SectionTitle("레벨별 독서량")
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                levelStats(state.books, state.stats).forEach { row ->
                    Text(
                        text = "${row.level.label} · ${row.count}권 · 완독 ${row.finished}"
                            + (row.averageAccuracy?.let { " · ${(it * 100).toInt()}%" } ?: ""),
                        style = SmapBodyStyle,
                        color = SmapText,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SmapSurface, RoundedCornerShape(12.dp))
                            .border(1.dp, SmapBorder, RoundedCornerShape(12.dp))
                            .padding(14.dp),
                    )
                }
            }
        }
        item {
            SectionTitle("이번 달 학습")
            MonthFootprint(
                thisMonth = state.summary!!.thisMonth,
                activeDays = state.summary.activeDaysThisMonth.toSet(),
            )
        }
        item {
            val breakdown = vocabBreakdown(state.vocab)
            SectionTitle("단어장")
            StatGrid(
                items = listOf(
                    "누적" to "${breakdown.total}개",
                    "아직 안 본 단어" to "${breakdown.fresh}개",
                    "모르는 단어" to "${breakdown.unknown}개",
                    "학습 중" to "${breakdown.mastering}개",
                ),
            )
        }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

@Composable
private fun StatGrid(items: List<Pair<String, String>>) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.height(180.dp),
        userScrollEnabled = false,
    ) {
        items(items) { (label, value) ->
            Column(
                modifier = Modifier
                    .background(SmapSurface, RoundedCornerShape(14.dp))
                    .border(1.dp, SmapBorder, RoundedCornerShape(14.dp))
                    .padding(14.dp),
            ) {
                Text(label, style = SmapCaptionStyle, color = SmapMuted)
                Text(value, style = SmapTitleStyle, color = SmapText)
            }
        }
    }
}

@Composable
private fun MonthFootprint(thisMonth: String, activeDays: Set<String>) {
    val cells = buildMonthGrid(thisMonth, activeDays)
    LazyVerticalGrid(
        columns = GridCells.Fixed(7),
        verticalArrangement = Arrangement.spacedBy(6.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(210.dp)
            .background(SmapSurface, RoundedCornerShape(16.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(16.dp))
            .padding(14.dp),
        userScrollEnabled = false,
    ) {
        items(cells) { cell ->
            Box(
                modifier = Modifier
                    .background(
                        if (cell.active) SmapPrimary else SmapPrimarySoft.copy(alpha = 0.45f),
                        RoundedCornerShape(6.dp),
                    )
                    .size(28.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = cell.day?.toString().orEmpty(),
                    style = SmapCaptionStyle,
                    color = if (cell.active) Color.White else SmapMuted,
                )
            }
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(title, style = SmapBodyEmphasisStyle, color = SmapText)
}

@Composable
private fun CenteredStats(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground),
        contentAlignment = Alignment.Center,
    ) { content() }
}

@Composable
private fun StatsError(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        Spacer(Modifier.height(16.dp))
        PrimaryButton(title = stringResource(R.string.action_retry), variant = PrimaryButtonVariant.Tonal, onClick = onRetry)
    }
}

@Composable
private fun StatsEmpty(message: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Filled.BarChart, contentDescription = null, tint = SmapMuted, modifier = Modifier.size(56.dp))
        Spacer(Modifier.height(16.dp))
        Text(message, style = SmapBodyStyle, color = SmapMuted, textAlign = TextAlign.Center)
    }
}
```

- [ ] **Step 3: Run compile to confirm remaining missing screens**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:compileDebugKotlin
```

Expected: FAIL only because Task 6 and Task 7 have not created the remaining screens.

---

### Task 6: Add Vocab ViewModel and Screen

**Files:**
- Create: `apps/android/app/src/main/java/site/smap/harubook/features/vocab/VocabViewModel.kt`
- Create: `apps/android/app/src/main/java/site/smap/harubook/features/vocab/VocabDeckScreen.kt`

- [ ] **Step 1: Add `VocabViewModel.kt`**

```kotlin
package site.smap.harubook.features.vocab

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import site.smap.harubook.core.models.VocabEntry
import site.smap.harubook.core.models.VocabResponse
import site.smap.harubook.core.networking.ApiClient

data class VocabUiState(
    val entries: List<VocabEntry> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

class VocabViewModel(private val profileId: Int) : ViewModel() {
    private val _state = MutableStateFlow(VocabUiState())
    val state: StateFlow<VocabUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val response: VocabResponse = ApiClient.get(
                    path = "/api/vocab",
                    query = mapOf("profileId" to profileId.toString()),
                )
                _state.update {
                    it.copy(
                        entries = dedupeVocabEntries(response.entries),
                        isLoading = false,
                        error = null,
                    )
                }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "단어장을 불러오지 못했어요.",
                    )
                }
            }
        }
    }
}
```

- [ ] **Step 2: Add `VocabDeckScreen.kt`**

```kotlin
package site.smap.harubook.features.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.R
import site.smap.harubook.core.models.VocabEntry
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

@Composable
fun VocabDeckScreen(profileId: Int) {
    val viewModel: VocabViewModel = viewModel(
        key = "vocab-$profileId",
        factory = remember(profileId) {
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return VocabViewModel(profileId) as T
                }
            }
        },
    )
    val state by viewModel.state.collectAsState()

    LaunchedEffect(profileId) { viewModel.load() }

    when {
        state.isLoading && state.entries.isEmpty() -> CenteredVocab { CircularProgressIndicator(color = SmapPrimary) }
        state.error != null && state.entries.isEmpty() -> VocabError(message = state.error!!, onRetry = viewModel::load)
        state.entries.isEmpty() -> VocabEmpty()
        else -> VocabList(entries = state.entries)
    }
}

@Composable
private fun VocabList(entries: List<VocabEntry>) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Column(modifier = Modifier.padding(top = 20.dp, bottom = 4.dp)) {
                Text(stringResource(R.string.vocab_title), style = SmapHeadingStyle, color = SmapText)
                Text("${entries.size}개의 단어", style = SmapCaptionStyle, color = SmapMuted)
            }
        }
        items(entries, key = { "${it.word}-${it.meaning}-${it.bookId}" }) { entry ->
            VocabRow(entry)
        }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

@Composable
private fun VocabRow(entry: VocabEntry) {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(14.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(14.dp))
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(entry.word, style = SmapBodyEmphasisStyle, color = SmapText)
            Text(
                "전체",
                style = SmapCaptionStyle,
                color = SmapPrimary,
                modifier = Modifier
                    .background(SmapPrimarySoft, RoundedCornerShape(percent = 50))
                    .padding(horizontal = 10.dp, vertical = 4.dp),
            )
        }
        Text(entry.meaning, style = SmapBodyStyle, color = SmapText)
        Text(entry.bookTitle, style = SmapCaptionStyle, color = SmapMuted)
    }
}

@Composable
private fun CenteredVocab(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) { content() }
}

@Composable
private fun VocabError(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        Spacer(Modifier.height(16.dp))
        PrimaryButton(title = stringResource(R.string.action_retry), variant = PrimaryButtonVariant.Tonal, onClick = onRetry)
    }
}

@Composable
private fun VocabEmpty() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Filled.Translate, contentDescription = null, tint = SmapMuted)
        Spacer(Modifier.height(16.dp))
        Text("아직 모은 단어가 없어요", style = SmapBodyEmphasisStyle, color = SmapText)
        Text(
            "책을 만들고 읽어 보면 단어가 여기에 쌓여요.",
            style = SmapCaptionStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
        )
    }
}
```

- [ ] **Step 3: Run compile to confirm settings screen is the only missing destination**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:compileDebugKotlin
```

Expected: FAIL only because Task 7 has not created `SettingsScreen`.

---

### Task 7: Add Settings Screen

**Files:**
- Create: `apps/android/app/src/main/java/site/smap/harubook/features/settings/SettingsScreen.kt`

- [ ] **Step 1: Add `SettingsScreen.kt`**

```kotlin
package site.smap.harubook.features.settings

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import site.smap.harubook.R
import site.smap.harubook.core.auth.AuthState
import site.smap.harubook.core.networking.AppConfig
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

@Composable
fun SettingsScreen(
    onSwitchProfile: () -> Unit,
    onSignOut: () -> Unit,
) {
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 20.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(stringResource(R.string.settings_title), style = SmapHeadingStyle, color = SmapText)
        Text("현재 로그인된 계정으로 하루책을 사용 중입니다.", style = SmapCaptionStyle, color = SmapMuted)

        SettingsRow(
            title = stringResource(R.string.action_switch_profile),
            subtitle = "다른 아이 프로필로 바꿉니다.",
            icon = Icons.Filled.SwapHoriz,
            onClick = onSwitchProfile,
        )

        SettingsRow(
            title = "이용약관",
            subtitle = "서비스 이용 조건을 확인합니다.",
            icon = Icons.Filled.Description,
            onClick = { openLegal(context, "/legal/terms") },
        )

        SettingsRow(
            title = "개인정보처리방침",
            subtitle = "개인정보 처리 기준을 확인합니다.",
            icon = Icons.Filled.PrivacyTip,
            onClick = { openLegal(context, "/legal/privacy") },
        )

        Spacer(Modifier.height(8.dp))

        SettingsRow(
            title = stringResource(R.string.action_logout),
            subtitle = "이 기기에서 로그아웃합니다.",
            icon = Icons.Filled.Logout,
            danger = true,
            onClick = {
                AuthState.signOut()
                onSignOut()
            },
        )
    }
}

@Composable
private fun SettingsRow(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    danger: Boolean = false,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(SmapSurface, RoundedCornerShape(14.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(14.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(icon, contentDescription = null, tint = if (danger) SmapDanger else SmapText)
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = SmapBodyEmphasisStyle, color = if (danger) SmapDanger else SmapText)
            Text(subtitle, style = SmapCaptionStyle, color = SmapMuted)
        }
    }
}

private fun openLegal(context: android.content.Context, path: String) {
    val url = Uri.parse("${AppConfig.API_BASE_URL}$path")
    CustomTabsIntent.Builder()
        .setShowTitle(true)
        .build()
        .launchUrl(context, url)
}
```

- [ ] **Step 2: Run compile**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:compileDebugKotlin
```

Expected: PASS.

- [ ] **Step 3: Commit Task 4-7 together if Task 4 was held**

```bash
git add apps/android/app/src/main/java/site/smap/harubook/features/home/HomeRouter.kt \
  apps/android/app/src/main/java/site/smap/harubook/features/home/MainTabScaffold.kt \
  apps/android/app/src/main/java/site/smap/harubook/features/stats/StatsViewModel.kt \
  apps/android/app/src/main/java/site/smap/harubook/features/stats/StatsDashboardScreen.kt \
  apps/android/app/src/main/java/site/smap/harubook/features/vocab/VocabViewModel.kt \
  apps/android/app/src/main/java/site/smap/harubook/features/vocab/VocabDeckScreen.kt \
  apps/android/app/src/main/java/site/smap/harubook/features/settings/SettingsScreen.kt \
  apps/android/app/src/main/res/values/strings.xml
git commit -m "feat(android): add iOS parity home tabs"
```

---

### Task 8: Final Verification

**Files:**
- Modify only if verification exposes a defect directly caused by Tasks 1-7.

- [ ] **Step 1: Run all Android unit tests**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:testDebugUnitTest
```

Expected: PASS. Existing environment may print Kotlin daemon fallback warnings; the build must still end with `BUILD SUCCESSFUL`.

- [ ] **Step 2: Build Debug APK**

Run:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:assembleDebug
```

Expected: PASS and APK generated under `apps/android/app/build/outputs/apk/debug/`.

- [ ] **Step 3: Check requested scope**

Run:

```bash
git diff --stat HEAD
git diff --name-only HEAD
```

Expected changed paths are limited to:

```text
apps/android/app/src/main/java/site/smap/harubook/core/models/
apps/android/app/src/main/java/site/smap/harubook/features/home/
apps/android/app/src/main/java/site/smap/harubook/features/settings/
apps/android/app/src/main/java/site/smap/harubook/features/stats/
apps/android/app/src/main/java/site/smap/harubook/features/vocab/
apps/android/app/src/main/res/values/strings.xml
apps/android/app/src/test/kotlin/site/smap/harubook/core/models/
apps/android/app/src/test/kotlin/site/smap/harubook/features/stats/
apps/android/app/src/test/kotlin/site/smap/harubook/features/vocab/
```

- [ ] **Step 4: Commit final fixes if needed**

If Step 1 or Step 2 required a direct fix, commit only those files:

```bash
git add <fixed-files>
git commit -m "fix(android): stabilize iOS parity tabs"
```

- [ ] **Step 5: Report completion**

Final report must include:

- Changed files grouped by feature.
- Test command results.
- Any manual verification not performed.
- Explicit note that excluded scope remains excluded: email login, Apple login, Store/IAP, Parents, Push, account deletion.
