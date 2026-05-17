package site.smap.harubook.core.networking

/**
 * iOS `APIError.swift` 미러. 호출자가 [Throwable.message]만 읽어도 한국어 설명을 얻는다.
 */
sealed class ApiError(message: String, cause: Throwable? = null) : Exception(message, cause) {
    data object Unauthorized : ApiError("로그인이 만료되었습니다. 다시 로그인해 주세요.")
    data object Cancelled : ApiError("요청이 취소되었습니다.")

    class Http(val status: Int, val code: String?, val body: String?) :
        ApiError("요청 실패 (HTTP $status)${body?.takeIf { it.isNotBlank() }?.let { " — $it" } ?: ""}")

    class Decoding(cause: Throwable) : ApiError("응답 파싱에 실패했습니다: ${cause.message}", cause)
    class Transport(cause: Throwable) : ApiError("네트워크 오류: ${cause.message}", cause)
}
