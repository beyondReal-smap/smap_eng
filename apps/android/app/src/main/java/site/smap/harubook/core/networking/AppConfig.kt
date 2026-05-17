package site.smap.harubook.core.networking

/**
 * iOS `AppConfig.swift` 미러. 환경 설정 단일 진입점.
 *
 * 추후 build variant(productFlavors)로 staging/production 분리 가능.
 */
object AppConfig {
    const val API_BASE_URL: String = "https://eng.smap.site"

    const val AUTH_CALLBACK_SCHEME: String = "smapeng"
    const val AUTH_CALLBACK_HOST: String = "auth"
    const val AUTH_CALLBACK_PATH: String = "/callback"

    val authCallbackUrl: String
        get() = "$AUTH_CALLBACK_SCHEME://$AUTH_CALLBACK_HOST$AUTH_CALLBACK_PATH"
}
