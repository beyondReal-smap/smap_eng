package site.smap.harubook.core.auth

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import kotlinx.coroutines.CompletableDeferred

/**
 * Chrome Custom Tabs로 OAuth 시작 페이지를 열고 deep link 콜백을 await.
 *
 * 이용 흐름:
 *  - [launchAndAwait]: 시작 URL을 Custom Tabs로 띄우고 콜백 Uri를 비동기로 기다린다.
 *  - [handleCallback]: MainActivity.onNewIntent 가 `smapeng://auth/callback...` deep link를
 *    수신했을 때 호출. 대기 중 deferred 를 완료시켜 [launchAndAwait] 가 반환되게 한다.
 */
object OAuthCoordinator {
    @Volatile
    private var pending: CompletableDeferred<Uri>? = null

    suspend fun launchAndAwait(context: Context, startUrl: Uri): Uri {
        val deferred = CompletableDeferred<Uri>().also { pending = it }
        CustomTabsIntent.Builder().setShowTitle(true).build()
            .launchUrl(context, startUrl)
        return deferred.await().also { pending = null }
    }

    fun handleCallback(uri: Uri) {
        pending?.complete(uri)
    }
}
