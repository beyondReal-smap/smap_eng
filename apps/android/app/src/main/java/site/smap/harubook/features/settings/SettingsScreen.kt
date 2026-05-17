package site.smap.harubook.features.settings

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import site.smap.harubook.R
import site.smap.harubook.core.auth.AuthState
import site.smap.harubook.core.push.DailyVocabReminder
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapDisplayStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.features.legal.LegalDocument
import site.smap.harubook.features.legal.openLegal

@Composable
fun SettingsScreen(
    onSwitchProfile: () -> Unit,
    onOpenParents: () -> Unit,
    onOpenStore: () -> Unit,
) {
    val context = LocalContext.current
    val reminderState by DailyVocabReminder.state.collectAsState()

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted -> if (granted) DailyVocabReminder.setEnabled(true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(stringResource(R.string.settings_title), style = SmapDisplayStyle, color = SmapText)
        Text("현재 로그인된 계정으로 하루책을 사용 중입니다.", style = SmapCaptionStyle, color = SmapMuted)

        SettingsRow(
            title = stringResource(R.string.action_switch_profile),
            subtitle = "다른 아이 프로필로 바꿉니다.",
            icon = Icons.Filled.SwapHoriz,
            onClick = onSwitchProfile,
        )

        SettingsRow(
            title = stringResource(R.string.settings_parents_mode),
            subtitle = stringResource(R.string.settings_parents_mode_subtitle),
            icon = Icons.Filled.Shield,
            onClick = onOpenParents,
        )

        SettingsRow(
            title = stringResource(R.string.settings_store),
            subtitle = "별 잔액을 충전합니다.",
            icon = Icons.Filled.Star,
            onClick = onOpenStore,
        )

        ReminderToggleRow(
            enabled = reminderState.enabled,
            hour = reminderState.hour,
            minute = reminderState.minute,
            onToggle = { wantEnabled ->
                if (!wantEnabled) {
                    DailyVocabReminder.setEnabled(false)
                    return@ReminderToggleRow
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    val granted = ContextCompat.checkSelfPermission(
                        context, Manifest.permission.POST_NOTIFICATIONS,
                    ) == PackageManager.PERMISSION_GRANTED
                    if (granted) DailyVocabReminder.setEnabled(true)
                    else permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    DailyVocabReminder.setEnabled(true)
                }
            },
        )

        SettingsRow(
            title = stringResource(R.string.settings_terms),
            subtitle = "서비스 이용 조건을 확인합니다.",
            icon = Icons.Filled.Description,
            onClick = { context.openLegal(LegalDocument.Terms) },
        )
        SettingsRow(
            title = stringResource(R.string.settings_privacy),
            subtitle = "개인정보 처리 기준을 확인합니다.",
            icon = Icons.Filled.PrivacyTip,
            onClick = { context.openLegal(LegalDocument.Privacy) },
        )
        SettingsRow(
            title = stringResource(R.string.settings_refund),
            subtitle = "결제·환불 기준을 확인합니다.",
            icon = Icons.Filled.Description,
            onClick = { context.openLegal(LegalDocument.Refund) },
        )
        SettingsRow(
            title = stringResource(R.string.settings_business),
            subtitle = "사업자 정보를 확인합니다.",
            icon = Icons.Filled.Storefront,
            onClick = { context.openLegal(LegalDocument.Business) },
        )

        Spacer(Modifier.height(8.dp))

        SettingsRow(
            title = stringResource(R.string.action_logout),
            subtitle = "이 기기에서 로그아웃합니다.",
            icon = Icons.AutoMirrored.Filled.Logout,
            danger = true,
            onClick = {
                AuthState.signOut()
                onSwitchProfile()
            },
        )
    }
}

@Composable
private fun ReminderToggleRow(
    enabled: Boolean,
    hour: Int,
    minute: Int,
    onToggle: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(14.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(14.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(Icons.Filled.Notifications, contentDescription = null, tint = SmapText)
        Column(modifier = Modifier.weight(1f)) {
            Text(stringResource(R.string.settings_reminder), style = SmapBodyEmphasisStyle, color = SmapText)
            Text(
                if (enabled) "매일 %02d:%02d에 알려드려요.".format(hour, minute)
                else "켜면 매일 같은 시각에 단어 복습을 알려드려요.",
                style = SmapCaptionStyle,
                color = SmapMuted,
            )
        }
        Switch(
            checked = enabled,
            onCheckedChange = onToggle,
            colors = SwitchDefaults.colors(checkedTrackColor = SmapPrimary),
        )
    }
}

@Composable
private fun SettingsRow(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    danger: Boolean = false,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .background(SmapSurface, RoundedCornerShape(14.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(14.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(icon, contentDescription = null, tint = if (danger) SmapDanger else SmapText)
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = SmapBodyEmphasisStyle, color = if (danger) SmapDanger else SmapText)
            Text(subtitle, style = SmapCaptionStyle, color = SmapMuted)
        }
    }
}
