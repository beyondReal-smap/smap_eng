package site.smap.harubook.features.profiles

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import site.smap.harubook.core.models.CreateProfileRequest
import site.smap.harubook.core.models.Profile
import site.smap.harubook.core.models.ProfileResponse
import site.smap.harubook.core.models.ProfilesResponse
import site.smap.harubook.core.networking.ApiClient

data class ProfileUiState(
    val profiles: List<Profile> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

class ProfileViewModel : ViewModel() {

    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                val response: ProfilesResponse = ApiClient.get("/api/profiles")
                _state.update { it.copy(profiles = response.profiles, isLoading = false, error = null) }
            } catch (e: Throwable) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "프로필을 불러오지 못했습니다.") }
            }
        }
    }

    fun create(name: String) {
        viewModelScope.launch {
            try {
                val response: ProfileResponse = ApiClient.post(
                    path = "/api/profiles",
                    body = CreateProfileRequest(name = name.trim()),
                )
                _state.update { it.copy(profiles = it.profiles + response.profile, error = null) }
            } catch (e: Throwable) {
                _state.update { it.copy(error = e.message ?: "프로필 생성에 실패했습니다.") }
            }
        }
    }
}
