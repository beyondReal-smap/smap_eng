package site.smap.harubook.features.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import site.smap.harubook.R
import site.smap.harubook.core.auth.AuthState
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapDisplayStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapText

@Composable
fun LoginScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var inFlight by remember { mutableStateOf<String?>(null) }
    var errorText by remember { mutableStateOf<String?>(null) }

    // 표시 직후 이전 에러 메시지 1회 가져오기 (대시보드용 보고 채널 없음).
    LaunchedEffect(Unit) {
        errorText = AuthState.lastError
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.weight(1f))

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Image(
                painter = painterResource(R.drawable.login_icon),
                contentDescription = null,
                modifier = Modifier.size(132.dp),
            )
            Text(
                text = stringResource(R.string.app_name),
                style = SmapDisplayStyle,
                color = SmapText,
            )
            Text(
                text = stringResource(R.string.login_subtitle),
                style = SmapBodyStyle,
                color = SmapMuted,
                textAlign = TextAlign.Center,
            )
        }

        Spacer(Modifier.weight(1f))

        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize(fraction = 0f), // no-op — 의도: bottom 영역
        ) {}

        // 버튼 그룹
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            PrimaryButton(
                title = stringResource(R.string.login_with_google),
                icon = Icons.Filled.AccountCircle,
                variant = PrimaryButtonVariant.Filled,
                isLoading = inFlight == "google",
                enabled = inFlight == null,
                onClick = {
                    scope.launch {
                        inFlight = "google"
                        val ok = AuthState.signIn(context, "google")
                        if (!ok) errorText = AuthState.lastError
                        inFlight = null
                    }
                },
            )
            PrimaryButton(
                title = stringResource(R.string.login_with_kakao),
                icon = Icons.Filled.ChatBubble,
                variant = PrimaryButtonVariant.Tonal,
                isLoading = inFlight == "kakao",
                enabled = inFlight == null,
                onClick = {
                    scope.launch {
                        inFlight = "kakao"
                        val ok = AuthState.signIn(context, "kakao")
                        if (!ok) errorText = AuthState.lastError
                        inFlight = null
                    }
                },
            )
        }

        errorText?.let {
            Spacer(Modifier.size(12.dp))
            Text(
                text = it,
                style = SmapCaptionStyle,
                color = SmapDanger,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 12.dp),
            )
        }

        Spacer(Modifier.size(16.dp))

        Text(
            text = stringResource(R.string.login_terms),
            style = SmapCaptionStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 8.dp),
        )
    }
}
