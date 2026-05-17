package site.smap.harubook.features.parents

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import site.smap.harubook.core.models.ParentalProfileReport
import site.smap.harubook.core.models.ParentalReportResponse
import site.smap.harubook.core.networking.ApiClient

data class WeeklyReportUiState(
    val reports: List<ParentalProfileReport> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

class WeeklyReportViewModel : ViewModel() {
    private val _state = MutableStateFlow(WeeklyReportUiState())
    val state: StateFlow<WeeklyReportUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val response: ParentalReportResponse = ApiClient.get("/api/parents/report")
                _state.update { it.copy(reports = response.report, isLoading = false) }
            } catch (e: Throwable) {
                _state.update {
                    it.copy(isLoading = false, error = "리포트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")
                }
            }
        }
    }
}
