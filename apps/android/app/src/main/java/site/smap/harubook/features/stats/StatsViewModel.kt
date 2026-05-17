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
                    it.copy(isLoading = false, error = e.message ?: "통계를 불러오지 못했어요.")
                }
            }
        }
    }
}
