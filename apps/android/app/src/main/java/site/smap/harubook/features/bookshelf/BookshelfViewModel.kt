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
    val ageFilter: Int? = null,
    val cefrFilter: CefrLevel? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val credits: CreditBalance? = null,
)

class BookshelfViewModel(val profileId: Int) : ViewModel() {

    private val _state = MutableStateFlow(BookshelfUiState())
    val state: StateFlow<BookshelfUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                val query = mutableMapOf("profileId" to profileId.toString())
                _state.value.ageFilter?.let { query["age"] = it.toString() }
                _state.value.cefrFilter?.let { query["cefr"] = it.label }

                val response: BooksResponse = ApiClient.get(
                    path = "/api/books",
                    query = query,
                )
                _state.update { it.copy(books = response.books, isLoading = false, error = null) }
            } catch (e: Throwable) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "책 목록을 불러오지 못했습니다.") }
            }
        }
    }

    fun setAge(age: Int?) {
        _state.update { it.copy(ageFilter = age) }
        load()
    }

    fun setCefr(cefr: CefrLevel?) {
        _state.update { it.copy(cefrFilter = cefr) }
        load()
    }

    fun resetFilters() {
        _state.update { it.copy(ageFilter = null, cefrFilter = null) }
        load()
    }

    fun fetchCredits() {
        viewModelScope.launch {
            try {
                val response: CreditsResponse = ApiClient.get("/api/billing/credits")
                _state.update { it.copy(credits = response.credits) }
            } catch (_: Throwable) {
                // 별 잔액은 보조 정보 — 소프트 페일.
            }
        }
    }
}
