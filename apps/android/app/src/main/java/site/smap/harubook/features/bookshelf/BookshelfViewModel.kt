package site.smap.harubook.features.bookshelf

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import site.smap.harubook.core.models.Book
import site.smap.harubook.core.models.BooksResponse
import site.smap.harubook.core.models.CefrLevel
import site.smap.harubook.core.models.CreditBalance
import site.smap.harubook.core.models.CreditsResponse
import site.smap.harubook.core.networking.ApiClient

data class BookshelfUiState(
    val books: List<Book> = emptyList(),
    val cefrFilter: CefrLevel? = null,
    val credits: CreditBalance? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
)

class BookshelfViewModel(private val profileId: Int) : ViewModel() {
    private val _state = MutableStateFlow(BookshelfUiState())
    val state: StateFlow<BookshelfUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                val query = buildMap {
                    put("profileId", profileId.toString())
                    _state.value.cefrFilter?.let { put("cefr", it.name) }
                }
                val response: BooksResponse = ApiClient.get(path = "/api/books", query = query)
                _state.update { it.copy(books = response.books, isLoading = false, error = null) }
            } catch (e: Throwable) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "책장을 불러오지 못했어요.") }
            }
        }
    }

    fun fetchCredits() {
        viewModelScope.launch {
            try {
                val response: CreditsResponse = ApiClient.get("/api/billing/credits")
                _state.update { it.copy(credits = response.credits) }
            } catch (_: Throwable) {
                // 별 잔액은 보조 정보 — soft fail.
            }
        }
    }

    fun setCefr(cefr: CefrLevel?) {
        _state.update { it.copy(cefrFilter = cefr) }
        load()
    }
}
