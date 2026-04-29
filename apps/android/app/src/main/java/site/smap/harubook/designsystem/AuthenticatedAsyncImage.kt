package site.smap.harubook.designsystem

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import android.graphics.BitmapFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import site.smap.harubook.core.networking.ApiClient

/**
 * `/api/static/images/...` 처럼 Bearer 인증이 필요한 미디어용.
 * Coil의 기본 ImageLoader는 헤더 주입이 까다로워 Phase 1에선 직접 다운로드 + 디코딩한다.
 */
@Composable
fun AuthenticatedAsyncImage(
    path: String,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    placeholder: @Composable () -> Unit = { DefaultImagePlaceholder() },
    failure: @Composable () -> Unit = { DefaultImagePlaceholder() },
) {
    var bitmap by remember(path) { mutableStateOf<ImageBitmap?>(null) }
    var failed by remember(path) { mutableStateOf(false) }

    LaunchedEffect(path) {
        bitmap = null
        failed = false
        try {
            val bytes = withContext(Dispatchers.IO) { ApiClient.downloadAuthenticated(path) }
            val decoded = withContext(Dispatchers.Default) {
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            }
            if (decoded != null) {
                bitmap = decoded.asImageBitmap()
            } else {
                failed = true
            }
        } catch (_: Throwable) {
            failed = true
        }
    }

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        when {
            bitmap != null -> Image(
                bitmap = bitmap!!,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = contentScale,
            )
            failed -> failure()
            else -> placeholder()
        }
    }
}

@Composable
private fun DefaultImagePlaceholder() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = SmapPrimary, strokeWidth = 2.dp)
    }
}
