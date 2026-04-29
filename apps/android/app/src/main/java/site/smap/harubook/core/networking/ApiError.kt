package site.smap.harubook.core.networking

/**
 * API 호출 시 발생하는 모든 실패 타입을 한 곳에 모은다.
 * 호출 측에서 [Throwable.message]만 봐도 사용자에게 보여줄 수 있는 한국어 설명이 들어 있다.
 */
sealed class ApiError(message: String, cause: Throwable? = null) : Exception(message, cause) {
    object Unauthorized : ApiError("로그인이 만료되었습니다. 다시 로그인해 주세요.")
    object Cancelled : ApiError("요청이 취소되었습니다.")

    class Http(val status: Int, val code: String?, body: String?) :
        ApiError("요청 실패 (HTTP $status)${body?.takeIf { it.isNotBlank() }?.let { " — $it" } ?: ""}")

    class Decoding(cause: Throwable) : ApiError("응답 파싱에 실패했습니다: ${cause.message}", cause)
    class Transport(cause: Throwable) : ApiError("네트워크 오류: ${cause.message}", cause)
}
