package site.smap.harubook.features.auth

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Email
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import site.smap.harubook.R
import site.smap.harubook.core.auth.AuthState
import site.smap.harubook.core.networking.AppConfig
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapDisplayStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapText

private enum class AuthRoute { Landing, EmailLogin, EmailSignup }

/**
 * iOS LoginView 미러.
 *
 * Apple Sign In은 Android 비대상이라 제외 — Google/Kakao/Email 3개 제공.
 * 이메일 흐름은 내부 AuthRoute로 분기(Landing↔EmailLogin↔EmailSignup).
 * 로그인 성공 시 [AuthState.phase] 가 SignedIn으로 바뀌고 RootScaffold가 화면을 교체한다.
 */
@Composable
fun LoginScreen() {
    val context = LocalContext.current
    var route by remember { mutableStateOf(AuthRoute.Landing) }

    val openLegal: (String) -> Unit = { kind ->
        CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()
            .launchUrl(context, Uri.parse("${AppConfig.API_BASE_URL}/legal/$kind"))
    }

    when (route) {
        AuthRoute.Landing -> Landing(onOpenEmail = { route = AuthRoute.EmailLogin }, onOpenLegal = openLegal)
        AuthRoute.EmailLogin -> EmailLoginScreen(
            onSignup = { route = AuthRoute.EmailSignup },
            onBack = { route = AuthRoute.Landing },
        )
        AuthRoute.EmailSignup -> EmailSignupScreen(
            onBack = { route = AuthRoute.EmailLogin },
            onOpenLegal = openLegal,
        )
    }
}

@Composable
private fun Landing(
    onOpenEmail: () -> Unit,
    onOpenLegal: (String) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var inFlight by remember { mutableStateOf<String?>(null) }
    var errorText by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { errorText = AuthState.lastError }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.size(48.dp))

        Image(
            painter = painterResource(R.drawable.login_icon),
            contentDescription = null,
            modifier = Modifier.size(96.dp),
        )

        Spacer(Modifier.size(14.dp))
        Text(stringResource(R.string.app_name), style = SmapDisplayStyle, color = SmapText)
        Spacer(Modifier.size(6.dp))
        Text(
            stringResource(R.string.login_subtitle),
            style = SmapBodyStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.size(48.dp))

        Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxSize()) {
            // Google: 흰 배경 + 회색 외곽선 + 검정 텍스트(브랜드 가이드).
            PrimaryButton(
                title = stringResource(R.string.login_with_google),
                icon = Icons.Filled.AccountCircle,
                variant = PrimaryButtonVariant.Filled,
                isLoading = inFlight == "google",
                enabled = inFlight == null,
                backgroundOverride = Color.White,
                foregroundOverride = Color(0xFF1F1F1F),
                borderOverride = Color(0xFFDADCE0),
                onClick = {
                    scope.launch {
                        inFlight = "google"
                        val ok = AuthState.signIn(context, "google")
                        if (!ok) errorText = AuthState.lastError
                        inFlight = null
                    }
                },
            )

            // 카카오: 노란 배경 + 검정 텍스트(브랜드 가이드).
            PrimaryButton(
                title = stringResource(R.string.login_with_kakao),
                icon = Icons.Filled.ChatBubble,
                variant = PrimaryButtonVariant.Filled,
                isLoading = inFlight == "kakao",
                enabled = inFlight == null,
                backgroundOverride = Color(0xFFFEE500),
                foregroundOverride = Color(0xFF191600),
                onClick = {
                    scope.launch {
                        inFlight = "kakao"
                        val ok = AuthState.signIn(context, "kakao")
                        if (!ok) errorText = AuthState.lastError
                        inFlight = null
                    }
                },
            )

            PrimaryButton(
                title = stringResource(R.string.login_with_email),
                icon = Icons.Filled.Email,
                variant = PrimaryButtonVariant.Outline,
                enabled = inFlight == null,
                onClick = onOpenEmail,
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

        Spacer(Modifier.size(20.dp))

        // 약관/개인정보 인라인 링크.
        val annotated = buildAnnotatedString {
            append("로그인하면 ")
            withStyle(SpanStyle(color = SmapPrimary)) { append("이용약관") }
            append("과 ")
            withStyle(SpanStyle(color = SmapPrimary)) { append("개인정보처리방침") }
            append("에 동의한 것으로 간주합니다.")
        }
        Text(
            annotated,
            style = SmapCaptionStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 8.dp),
        )

        Spacer(Modifier.size(8.dp))
        Column(verticalArrangement = Arrangement.spacedBy(6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            TextLink(stringResource(R.string.login_terms_link)) { onOpenLegal("terms") }
            TextLink(stringResource(R.string.login_privacy_link)) { onOpenLegal("privacy") }
        }
    }
}

@Composable
private fun TextLink(text: String, onClick: () -> Unit) {
    Text(
        text = text,
        style = SmapCaptionStyle,
        color = SmapPrimary,
        modifier = Modifier
            .padding(2.dp)
            .clickable(onClick = onClick),
    )
}
