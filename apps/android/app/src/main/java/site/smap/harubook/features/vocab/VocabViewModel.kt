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
                    it.copy(entries = dedupeVocabEntries(response.entries), isLoading = false)
                }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(isLoading = false, error = e.message ?: "단어장을 불러오지 못했어요.")
                }
            }
        }
    }
}
