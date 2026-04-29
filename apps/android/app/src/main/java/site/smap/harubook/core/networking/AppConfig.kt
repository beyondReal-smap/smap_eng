package site.smap.harubook.core.networking

/**
 * 빌드 환경 설정. 추후 BuildConfig 또는 변형(stage/prod)으로 분리할 수 있다.
 */
object AppConfig {
    const val API_BASE_URL = "https://eng.smap.site"
    const val AUTH_CALLBACK_SCHEME = "smapeng"
    const val AUTH_CALLBACK_HOST = "auth"
    const val AUTH_CALLBACK_PATH = "/callback"

    val authCallbackUrl: String = "$AUTH_CALLBACK_SCHEME://$AUTH_CALLBACK_HOST$AUTH_CALLBACK_PATH"
}
