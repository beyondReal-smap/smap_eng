package site.smap.harubook.features.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
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
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

@Composable
fun EmailSignupScreen(
    onBack: () -> Unit,
    onOpenLegal: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var childName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var agreeAge by remember { mutableStateOf(false) }
    var agreeTerms by remember { mutableStateOf(false) }
    var agreePrivacy by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var generalError by remember { mutableStateOf<String?>(null) }

    val canSubmit = childName.trim().isNotEmpty() &&
        email.trim().isNotEmpty() &&
        password.length >= 8 &&
        agreeAge && agreeTerms && agreePrivacy &&
        !isSubmitting

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
            Text("계정 만들기", style = SmapTitleStyle, color = SmapText)
            Text("아이의 영어 학습 여정을 시작해 보세요.", style = SmapBodyStyle, color = SmapMuted)
        }

        LabeledField(
            label = "아이 이름 (또는 별명)",
            placeholder = "예: 지우",
            value = childName,
            onValueChange = { childName = it },
            keyboardType = KeyboardType.Text,
            isSecure = false,
        )
        LabeledField(
            label = "이메일",
            placeholder = "you@example.com",
            value = email,
            onValueChange = { email = it; emailError = null },
            keyboardType = KeyboardType.Email,
            isSecure = false,
            error = emailError,
        )
        LabeledField(
            label = "비밀번호",
            placeholder = "영문 + 숫자 포함 8자 이상",
            value = password,
            onValueChange = { password = it; passwordError = null },
            keyboardType = KeyboardType.Password,
            isSecure = true,
            error = passwordError,
        )

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ConsentToggle(
                checked = agreeAge,
                onCheckedChange = { agreeAge = it },
                title = "[필수] 만 14세 이상 보호자입니다.",
            )
            ConsentToggle(
                checked = agreeTerms,
                onCheckedChange = { agreeTerms = it },
                title = "[필수] 이용약관에 동의합니다.",
                linkTitle = "이용약관 보기",
                onLink = { onOpenLegal("terms") },
            )
            ConsentToggle(
                checked = agreePrivacy,
                onCheckedChange = { agreePrivacy = it },
                title = "[필수] 개인정보 수집·이용에 동의합니다.",
                linkTitle = "개인정보처리방침 보기",
                onLink = { onOpenLegal("privacy") },
            )
        }

        generalError?.let { Text(it, style = SmapCaptionStyle, color = SmapDanger) }

        PrimaryButton(
            title = "가입하고 시작",
            enabled = canSubmit,
            isLoading = isSubmitting,
            onClick = {
                scope.launch {
                    passwordError = null
                    emailError = null
                    generalError = null

                    // 웹 SignupSchema와 동일: 영문 + 숫자 포함 8자 이상.
                    val hasLetter = password.any { it.isLetter() }
                    val hasDigit = password.any { it.isDigit() }
                    if (password.length < 8 || !hasLetter || !hasDigit) {
                        passwordError = "비밀번호는 영문과 숫자를 포함해 8자 이상이어야 해요."
                        return@launch
                    }

                    isSubmitting = true
                    val outcome = AuthState.signUp(
                        childName = childName.trim(),
                        email = email.trim(),
                        password = password,
                        agreeAge = agreeAge,
                        agreeTerms = agreeTerms,
                        agreePrivacy = agreePrivacy,
                    )
                    isSubmitting = false
                    when (outcome) {
                        AuthState.SignupOutcome.Success -> Unit // RootScaffold 가 전환.
                        AuthState.SignupOutcome.DuplicateEmail -> emailError = "이미 가입된 이메일이에요."
                        is AuthState.SignupOutcome.Failure -> generalError = outcome.message
                    }
                }
            },
        )
    }
}

@Composable
private fun ConsentToggle(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    title: String,
    linkTitle: String? = null,
    onLink: (() -> Unit)? = null,
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onCheckedChange(!checked) },
        ) {
            Checkbox(
                checked = checked,
                onCheckedChange = onCheckedChange,
                colors = CheckboxDefaults.colors(checkedColor = SmapPrimary),
            )
            Text(title, style = SmapBodyStyle, color = SmapText)
        }
        if (linkTitle != null && onLink != null) {
            Text(
                linkTitle,
                style = SmapCaptionStyle,
                color = SmapPrimary,
                modifier = Modifier
                    .padding(start = 44.dp)
                    .clickable(onClick = onLink),
            )
        }
    }
}
