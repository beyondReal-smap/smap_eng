package site.smap.harubook.core.models

import kotlinx.serialization.Serializable

@Serializable
data class Profile(
    val id: Int,
    val name: String,
    /** 자녀 나이 5~10. 누락 시 7(서버 default). */
    val age: Int = 7,
    val avatar: String? = null,
    /** ISO8601 문자열(`2026-04-22T14:21:26.000Z`). 백엔드 기본 직렬화 결과. */
    val createdAt: String? = null,
)

@Serializable
data class ProfilesResponse(val profiles: List<Profile>)

@Serializable
data class ProfileResponse(val profile: Profile)

@Serializable
data class CreateProfileRequest(
    val name: String,
    val age: Int = 7,
    val avatar: String? = null,
)
