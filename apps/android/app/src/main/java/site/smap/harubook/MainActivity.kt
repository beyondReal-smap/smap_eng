package site.smap.harubook

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import site.smap.harubook.core.auth.AuthState
import site.smap.harubook.core.auth.OAuthCoordinator
import site.smap.harubook.designsystem.HaruBookTheme
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.features.auth.LoginScreen
import site.smap.harubook.features.home.HomeRouter

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        intent?.let(::routeIntent)
        setContent {
            HaruBookTheme { RootScaffold() }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        routeIntent(intent)
    }

    private fun routeIntent(intent: Intent) {
        val data = intent.data ?: return
        if (data.scheme == "smapeng") {
            OAuthCoordinator.handleCallback(data)
        }
    }
}

@Composable
private fun RootScaffold() {
    val phase by AuthState.phase.collectAsState()
    LaunchedEffect(Unit) { AuthState.refreshFromStorage() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            // status bar + navigation bar 영역을 침범하지 않도록 inset 적용.
            // 모든 화면이 이 Box 아래에 그려지므로 한 곳에서 일괄 처리.
            .systemBarsPadding(),
        contentAlignment = Alignment.Center,
    ) {
        when (phase) {
            AuthState.Phase.Loading -> CircularProgressIndicator(color = SmapPrimary)
            AuthState.Phase.SignedOut -> LoginScreen()
            AuthState.Phase.SignedIn -> HomeRouter()
        }
    }
}
