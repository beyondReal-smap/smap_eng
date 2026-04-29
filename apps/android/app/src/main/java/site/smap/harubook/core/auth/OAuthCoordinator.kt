package site.smap.harubook.core.auth

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import kotlinx.coroutines.CompletableDeferred

/**
 * Chrome Custom Tabs 기반 OAuth 흐름 조정자.
 *
 * - [launchAndAwait]: Custom Tabs로 인증 시작 URL 오픈 후 콜백 인텐트가 도착할 때까지 suspend.
 * - [handleCallback]: `MainActivity.onNewIntent` 가 deep link(scheme=`smapeng`)를 받았을 때 호출.
 *
 * iOS의 ASWebAuthenticationSession이 콜백을 직접 반환하는 것과 달리, Android는 Activity onNewIntent
 * 경로로 콜백이 들어오므로 [CompletableDeferred]로 직접 게이트한다.
 */
object OAuthCoordinator {

    private var pending: CompletableDeferred<Uri>? = null

    suspend fun launchAndAwait(context: Context, authStartUrl: Uri): Uri {
        cancelPending()

        val deferred = CompletableDeferred<Uri>()
        pending = deferred

        val intent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()
        intent.launchUrl(context, authStartUrl)

        return deferred.await()
    }

    fun handleCallback(uri: Uri) {
        pending?.complete(uri)
        pending = null
    }

    fun cancelPending() {
        pending?.cancel()
        pending = null
    }
}
