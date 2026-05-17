package site.smap.harubook.designsystem

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import android.graphics.BitmapFactory
import site.smap.harubook.core.networking.ApiClient

/**
 * iOS `AuthenticatedAsyncImage.swift` 미러.
 * `/api/static/images/...` 처럼 Bearer 토큰이 필요한 이미지를 ApiClient로 받아 렌더.
 *
 * Coil은 헤더 인터셉터 설정이 필요해 ApiClient 한 곳에서 토큰을 다루도록 직접 호출 방식 채택.
 */
@Composable
fun AuthenticatedAsyncImage(
    path: String,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
    placeholder: @Composable () -> Unit = {},
    failure: @Composable () -> Unit = {},
) {
    var state by remember(path) { mutableStateOf<LoadState>(LoadState.Loading) }

    LaunchedEffect(path) {
        state = LoadState.Loading
        state = try {
            val bytes = ApiClient.downloadAuthenticated(path)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            if (bitmap != null) LoadState.Success(bitmap.asImageBitmap()) else LoadState.Failed
        } catch (_: Throwable) {
            LoadState.Failed
        }
    }

    Box(modifier = modifier) {
        when (val s = state) {
            is LoadState.Loading -> placeholder()
            is LoadState.Failed -> failure()
            is LoadState.Success -> Image(
                bitmap = s.bitmap,
                contentDescription = null,
                contentScale = contentScale,
                modifier = Modifier,
            )
        }
    }
}

private sealed class LoadState {
    data object Loading : LoadState()
    data object Failed : LoadState()
    data class Success(val bitmap: ImageBitmap) : LoadState()
}
