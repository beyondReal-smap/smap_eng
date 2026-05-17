package site.smap.harubook.features.parents

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import site.smap.harubook.core.parentalpin.ParentalPinStore
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapTitleStyle

private enum class SetupStep { FirstEntry, ConfirmEntry }

@Composable
fun ParentalPinGateScreen(onBack: () -> Unit) {
    val hasPin by ParentalPinStore.hasPin.collectAsState()
    val unlocked by ParentalPinStore.unlocked.collectAsState()

    Column(modifier = Modifier.fillMaxSize().background(SmapBackground)) {
        BackBar(onBack)
        when {
            unlocked -> WeeklyReportScreen(onLock = { ParentalPinStore.lock() })
            hasPin -> UnlockView()
            else -> SetupView()
        }
    }
}

@Composable
private fun BackBar(onBack: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(
            Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "뒤로",
            tint = SmapText,
            modifier = Modifier.size(28.dp).clickable(onClick = onBack),
        )
        Text("보호자 모드", style = SmapTitleStyle, color = SmapText)
    }
}

@Composable
private fun SetupView() {
    var step by remember { mutableStateOf(SetupStep.FirstEntry) }
    var pin1 by remember { mutableStateOf("") }
    var pin2 by remember { mutableStateOf("") }
    var shakeToken by remember { mutableStateOf(0) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    PinScaffold(
        icon = Icons.Filled.Shield,
        title = if (step == SetupStep.FirstEntry) "보호자 PIN을 만들어주세요" else "한 번 더 입력해 주세요",
        subtitle = "아이가 보호자 모드에 실수로 들어가지 않도록 4자리 숫자로 잠그는 단순 PIN입니다.",
        errorMessage = errorMessage,
    ) {
        PinPad(
            value = if (step == SetupStep.FirstEntry) pin1 else pin2,
            onValueChange = { if (step == SetupStep.FirstEntry) pin1 = it else pin2 = it },
            onComplete = { entered ->
                if (step == SetupStep.FirstEntry) {
                    step = SetupStep.ConfirmEntry
                } else if (entered == pin1) {
                    runCatching { ParentalPinStore.setPin(entered) }
                        .onFailure { errorMessage = "PIN 저장에 실패했어요. 다시 시도해 주세요." }
                } else {
                    shakeToken += 1
                    errorMessage = "두 PIN이 달라요. 다시 입력해 주세요."
                    pin1 = ""
                    pin2 = ""
                    step = SetupStep.FirstEntry
                }
            },
            shakeToken = shakeToken,
        )
    }
}

@Composable
private fun UnlockView() {
    var entered by remember { mutableStateOf("") }
    var shakeToken by remember { mutableStateOf(0) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    PinScaffold(
        icon = Icons.Filled.Lock,
        title = "보호자 PIN을 입력해 주세요",
        subtitle = "입력 후 30분 동안 자동으로 보호자 모드가 유지됩니다.",
        errorMessage = errorMessage,
        footer = {
            Text(
                "PIN을 잊으셨나요? 다시 설정",
                style = SmapCaptionStyle,
                color = SmapMuted,
                modifier = Modifier
                    .padding(bottom = 24.dp)
                    .clickable {
                        ParentalPinStore.reset()
                        entered = ""
                        errorMessage = null
                    },
            )
        },
    ) {
        PinPad(
            value = entered,
            onValueChange = { entered = it },
            onComplete = { value ->
                if (ParentalPinStore.unlock(value)) {
                    entered = ""
                    errorMessage = null
                } else {
                    shakeToken += 1
                    errorMessage = "PIN이 달라요. 다시 입력해 주세요."
                    entered = ""
                }
            },
            shakeToken = shakeToken,
        )
    }
}

@Composable
private fun PinScaffold(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    errorMessage: String?,
    footer: @Composable () -> Unit = {},
    content: @Composable () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(top = 32.dp, start = 24.dp, end = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(28.dp),
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Icon(icon, contentDescription = null, tint = SmapPrimary, modifier = Modifier.size(48.dp))
            Text(title, style = SmapTitleStyle, color = SmapText, textAlign = TextAlign.Center)
            Text(subtitle, style = SmapCaptionStyle, color = SmapMuted, textAlign = TextAlign.Center)
        }
        content()
        errorMessage?.let { Text(it, style = SmapBodyStyle, color = SmapDanger) }
        Spacer(Modifier.height(1.dp))
        Column(
            modifier = Modifier.fillMaxWidth().weight(1f, fill = false),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Bottom,
        ) { footer() }
    }
}
