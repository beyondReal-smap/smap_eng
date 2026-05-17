package site.smap.harubook

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
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
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapText

/**
 * 단일 Activity. AuthState.phase 에 따라 LoginScreen ↔ HomeRouter 분기 (이후 Phase에서 추가).
 * 현재는 Phase 1~2 범위라 phase 표시만 한다.
 */
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
            .background(SmapBackground),
        contentAlignment = Alignment.Center,
    ) {
        when (phase) {
            AuthState.Phase.Loading -> CircularProgressIndicator()
            AuthState.Phase.SignedOut -> Text("로그인 화면 (Phase 3)", style = SmapBodyStyle, color = SmapText)
            AuthState.Phase.SignedIn -> Text("홈 화면 (Phase 3)", style = SmapBodyStyle, color = SmapText)
        }
    }
}
