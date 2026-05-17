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
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import site.smap.harubook.R
import site.smap.harubook.core.auth.AuthState
import site.smap.harubook.core.models.BusinessInfo
import site.smap.harubook.core.push.DailyVocabReminder
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBadgeStyle
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapDisplayStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText
import site.smap.harubook.designsystem.SmapWarn
import site.smap.harubook.features.legal.LegalDocument
import site.smap.harubook.features.legal.openLegal

/**
 * 설정 화면 — iOS `SettingsView.swift` 패리티.
 *
 * 섹션 헤더(아이콘 + 컬러)로 영역을 구분하고, 각 섹션 안에 행 카드들을 배치한다.
 * 이전엔 모든 행이 같은 톤으로 평면 나열되어 어떤 영역인지 즉시 파악이 어려웠다.
 */
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
            .background(SmapBackground),
    ) {
        // 헤더 — iOS pageHeader 패리티. ScrollView 바깥에 두어 상단 고정.
        // 이전엔 verticalScroll 안에 있어 본문과 함께 스크롤되어 헤더가 사라졌다.
        Column(
            verticalArrangement = Arrangement.spacedBy(4.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(top = 20.dp, bottom = 8.dp),
        ) {
            Text(stringResource(R.string.settings_title), style = SmapDisplayStyle, color = SmapText)
            Text(
                stringResource(R.string.settings_subtitle),
                style = SmapBodyStyle,
                color = SmapMuted,
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
        // 계정 섹션 — 프로필 전환 + 로그아웃.
        SectionHeader(text = stringResource(R.string.settings_section_account), icon = Icons.Filled.Person, color = SmapText)
        SettingsRow(
            title = stringResource(R.string.action_switch_profile),
            icon = Icons.Filled.SwapHoriz,
            onClick = onSwitchProfile,
        )
        SettingsRow(
            title = stringResource(R.string.action_logout),
            icon = Icons.AutoMirrored.Filled.Logout,
            danger = true,
            onClick = {
                AuthState.signOut()
                onSwitchProfile()
            },
        )

        // 별 충전 섹션.
        SectionHeader(text = stringResource(R.string.settings_section_store), icon = Icons.Filled.Star, color = SmapWarn)
        SettingsRow(
            title = stringResource(R.string.settings_store),
            icon = Icons.Filled.Star,
            onClick = onOpenStore,
        )
        SectionFooter(stringResource(R.string.settings_store_footer))

        // 단어 복습 알림 섹션.
        SectionHeader(
            text = stringResource(R.string.settings_section_reminder),
            icon = Icons.Filled.NotificationsActive,
            color = Color(0xFF8A6300),
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
        SectionFooter(
            if (reminderState.enabled) {
                "매일 %02d:%02d에 단어 복습 알림을 보내드려요.".format(reminderState.hour, reminderState.minute)
            } else {
                "원하는 시간에 단어 복습을 잊지 않도록 단말에서 알림을 보내드려요."
            },
        )

        // 보호자 모드 섹션.
        SectionHeader(
            text = stringResource(R.string.settings_section_parents),
            icon = Icons.Filled.Group,
            color = SmapPrimary,
        )
        SettingsRow(
            title = stringResource(R.string.settings_parents_mode_title),
            icon = Icons.Filled.Shield,
            onClick = onOpenParents,
        )
        SectionFooter(stringResource(R.string.settings_parents_footer))

        // 법적 정보 섹션.
        SectionHeader(
            text = stringResource(R.string.settings_section_legal),
            icon = Icons.Filled.Description,
            color = SmapMuted,
        )
        SettingsRow(
            title = stringResource(R.string.settings_terms),
            icon = Icons.Filled.Description,
            onClick = { context.openLegal(LegalDocument.Terms) },
        )
        SettingsRow(
            title = stringResource(R.string.settings_privacy),
            icon = Icons.Filled.PrivacyTip,
            onClick = { context.openLegal(LegalDocument.Privacy) },
        )
        SettingsRow(
            title = stringResource(R.string.settings_refund),
            icon = Icons.Filled.Description,
            onClick = { context.openLegal(LegalDocument.Refund) },
        )
        SettingsRow(
            title = stringResource(R.string.settings_business),
            icon = Icons.Filled.Storefront,
            onClick = { context.openLegal(LegalDocument.Business) },
        )

        // 앱 정보 섹션 — iOS appInfoSection 패리티. 신규 추가.
        SectionHeader(
            text = stringResource(R.string.settings_section_app_info),
            icon = Icons.Filled.Info,
            color = SmapMuted,
        )
        InfoRow(stringResource(R.string.settings_app_info_service), BusinessInfo.SERVICE_NAME)
        InfoRow(stringResource(R.string.settings_app_info_company), BusinessInfo.COMPANY_NAME)
        InfoRow(stringResource(R.string.settings_app_info_version), appVersion(context))
        InfoRow(stringResource(R.string.settings_app_info_contact), BusinessInfo.EMAIL)

        Spacer(Modifier.height(4.dp))
        }
    }
}

/**
 * 섹션 헤더 — 아이콘 + 컬러로 영역 정체성을 구분. iOS sectionHeader 패리티.
 */
@Composable
private fun SectionHeader(text: String, icon: ImageVector, color: Color) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 4.dp, start = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.height(14.dp))
        Text(text = text, style = SmapBadgeStyle.copy(fontSize = 14.sp), color = color)
    }
}

@Composable
private fun SectionFooter(text: String) {
    Text(
        text = text,
        style = SmapCaptionStyle,
        color = SmapMuted,
        modifier = Modifier.fillMaxWidth().padding(start = 4.dp, top = 4.dp, bottom = 4.dp),
    )
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
        Text(
            text = stringResource(R.string.settings_reminder),
            style = SmapBodyEmphasisStyle,
            color = SmapText,
            modifier = Modifier.weight(1f),
        )
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
    icon: ImageVector,
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
        Text(
            text = title,
            style = SmapBodyEmphasisStyle,
            color = if (danger) SmapDanger else SmapText,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun InfoRow(title: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(14.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(14.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = title, style = SmapBodyEmphasisStyle, color = SmapText, modifier = Modifier.weight(1f))
        Text(text = value, style = SmapBodyStyle, color = SmapMuted)
    }
}

/** BuildConfig.VERSION_NAME 가 신뢰성 있어 우선 사용. 폴백은 PackageManager. */
private fun appVersion(context: android.content.Context): String {
    return runCatching {
        val pkg = context.packageManager.getPackageInfo(context.packageName, 0)
        val name = pkg.versionName ?: "?"
        @Suppress("DEPRECATION")
        val code = pkg.versionCode
        "$name ($code)"
    }.getOrDefault("?")
}
