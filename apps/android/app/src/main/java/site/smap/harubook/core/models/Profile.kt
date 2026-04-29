package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class Profile(
    val id: Int,
    val name: String,
    val avatar: String? = null,
)

@Serializable
internal data class ProfilesResponse(val profiles: List<Profile>)

@Serializable
internal data class ProfileResponse(val profile: Profile)

@Serializable
internal data class CreateProfileRequest(val name: String)
