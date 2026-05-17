package site.smap.harubook.features.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import site.smap.harubook.core.auth.AuthState
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

@Composable
fun EmailLoginScreen(
    onSignup: () -> Unit,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val canSubmit = email.trim().isNotEmpty() && password.isNotEmpty() && !isSubmitting

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 32.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        BackBar(onBack = onBack)

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("이메일로 로그인", style = SmapTitleStyle, color = SmapText)
            Text("가입하신 이메일과 비밀번호를 입력해 주세요.", style = SmapBodyStyle, color = SmapMuted)
        }

        LabeledField(
            label = "이메일",
            placeholder = "you@example.com",
            value = email,
            onValueChange = { email = it },
            keyboardType = KeyboardType.Email,
            isSecure = false,
        )
        LabeledField(
            label = "비밀번호",
            placeholder = "8자 이상",
            value = password,
            onValueChange = { password = it },
            keyboardType = KeyboardType.Password,
            isSecure = true,
        )

        errorMessage?.let { Text(it, style = SmapCaptionStyle, color = SmapDanger) }

        PrimaryButton(
            title = "로그인",
            enabled = canSubmit,
            isLoading = isSubmitting,
            onClick = {
                scope.launch {
                    isSubmitting = true
                    errorMessage = null
                    val ok = AuthState.signInWithEmail(email.trim(), password)
                    isSubmitting = false
                    if (!ok) errorMessage = AuthState.lastError
                    // 성공 시 AuthState.phase=SignedIn 으로 전이되어 RootScaffold가 화면을 바꿈.
                }
            },
        )

        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("아직 계정이 없으신가요?", style = SmapBodyStyle, color = SmapMuted)
            Text(
                "  회원가입",
                style = SmapBodyEmphasisStyle,
                color = SmapPrimary,
                modifier = Modifier
                    .padding(start = 4.dp)
                    .clickable(onClick = onSignup),
            )
        }
    }
}

@Composable
internal fun BackBar(onBack: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onBack),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "뒤로", tint = SmapMuted)
        Text("뒤로", style = SmapBodyStyle, color = SmapMuted)
        Spacer(Modifier.size(0.dp))
    }
}
