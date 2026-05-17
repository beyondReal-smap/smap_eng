package site.smap.harubook.features.profiles

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.R
import site.smap.harubook.core.models.Profile
import site.smap.harubook.designsystem.PrimaryButton
import site.smap.harubook.designsystem.PrimaryButtonVariant
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyEmphasisStyle
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapDanger
import site.smap.harubook.designsystem.SmapDisplayStyle
import site.smap.harubook.designsystem.SmapHeadingStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface
import site.smap.harubook.designsystem.SmapText

@Composable
fun ProfilePickerScreen(
    onSelect: (Profile) -> Unit,
    viewModel: ProfileViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsState()
    var creating by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<Profile?>(null) }

    LaunchedEffect(Unit) { viewModel.load() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(top = 24.dp),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(stringResource(R.string.profile_picker_title), style = SmapDisplayStyle, color = SmapText)
            Text(stringResource(R.string.profile_picker_subtitle), style = SmapBodyStyle, color = SmapMuted)
        }

        Spacer(Modifier.size(16.dp))

        when {
            state.isLoading && state.profiles.isEmpty() -> Loading()
            state.error != null && state.profiles.isEmpty() -> ErrorBlock(
                message = state.error.orEmpty(),
                onRetry = viewModel::load,
            )
            // iOS ProfilePickerView.emptyState 패리티 — 프로필 0명 일 때 큰 PersonAdd 아이콘 +
            // "첫 프로필을 추가해 주세요" 안내 + 캡슐 CTA 한 개. 강제 모달은 사용자 부담.
            state.profiles.isEmpty() -> EmptyState(onAdd = { creating = true })
            else -> ProfileGrid(
                profiles = state.profiles,
                onSelect = onSelect,
                onOptionsRequest = { pendingDelete = it },
                onAdd = { creating = true },
            )
        }
    }

    if (creating) {
        CreateProfileSheet(
            error = state.error,
            onDismiss = {
                creating = false
                viewModel.clearError()
            },
            onCreate = { name, age, avatar ->
                viewModel.create(name, age, avatar)
                creating = false
            },
        )
    }

    pendingDelete?.let { p ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("프로필을 삭제할까요?", style = SmapHeadingStyle, color = SmapText) },
            text = {
                Text(
                    "${p.name} 프로필이 목록에서 사라져요. 만든 책과 학습 기록은 보존돼요.",
                    style = SmapBodyStyle,
                    color = SmapMuted,
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.delete(p)
                    pendingDelete = null
                }) {
                    Text(stringResource(R.string.profile_delete), color = SmapDanger)
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }) {
                    Text(stringResource(R.string.action_close), color = SmapMuted)
                }
            },
            containerColor = SmapSurface,
        )
    }
}

@Composable
private fun Loading() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = SmapPrimary)
    }
}

@Composable
private fun ErrorBlock(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(message, style = SmapBodyStyle, color = SmapDanger, textAlign = TextAlign.Center)
        PrimaryButton(
            title = stringResource(R.string.action_retry),
            variant = PrimaryButtonVariant.Tonal,
            onClick = onRetry,
        )
    }
}

@Composable
private fun ProfileGrid(
    profiles: List<Profile>,
    onSelect: (Profile) -> Unit,
    onOptionsRequest: (Profile) -> Unit,
    onAdd: () -> Unit,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        items(profiles, key = { it.id }) { profile ->
            ProfileCard(
                profile = profile,
                onClick = { onSelect(profile) },
                onOptionsRequest = { onOptionsRequest(profile) },
            )
        }
        item(key = "__add__") {
            AddCard(onClick = onAdd)
        }
    }
}

@Composable
private fun ProfileCard(
    profile: Profile,
    onClick: () -> Unit,
    onOptionsRequest: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 180.dp)
            .pointerInput(profile.id) {
                // long-press 도 옵션 진입 — iOS contextMenu 패리티.
                detectTapGestures(onTap = { onClick() }, onLongPress = { onOptionsRequest() })
            }
            .background(SmapSurface, RoundedCornerShape(24.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(24.dp)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .background(SmapPrimarySoft, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                val avatar = profile.avatar
                if (!avatar.isNullOrEmpty()) {
                    Text(text = avatar, style = SmapDisplayStyle)
                } else {
                    Text(text = profile.name.take(1), style = SmapDisplayStyle, color = SmapPrimary)
                }
            }
            Text(profile.name, style = SmapBodyEmphasisStyle, color = SmapText)
        }
        // iOS ProfilePickerView 우상단 ⋯ Menu 패리티 — long-press 없이도 한 번 탭으로 옵션 진입.
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 10.dp, end = 10.dp)
                .size(30.dp)
                .clip(CircleShape)
                .background(SmapSurface)
                .border(1.dp, SmapBorder, CircleShape)
                .clickable(onClick = onOptionsRequest),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.MoreHoriz,
                contentDescription = "${profile.name} 옵션",
                tint = SmapMuted,
                modifier = Modifier.size(16.dp),
            )
        }
    }
}

/** iOS ProfilePickerView.emptyState 패리티 — 큰 person 아이콘 + 안내 + 캡슐 CTA. */
@Composable
private fun EmptyState(onAdd: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Filled.PersonAdd,
            contentDescription = null,
            tint = SmapPrimary,
            modifier = Modifier.size(64.dp),
        )
        Spacer(Modifier.size(20.dp))
        Text(
            text = "첫 프로필을 추가해 주세요",
            style = SmapHeadingStyle,
            color = SmapText,
        )
        Spacer(Modifier.size(6.dp))
        Text(
            text = "아이의 이름과 나이를 알려주면\n그에 맞는 영어 동화를 만들어 드려요.",
            style = SmapBodyStyle,
            color = SmapMuted,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.size(24.dp))
        // 캡슐 CTA — 책장의 "새 동화 만들기" 와 동일한 톤·모양.
        androidx.compose.foundation.layout.Row(
            modifier = Modifier
                .heightIn(min = 52.dp)
                .clip(CircleShape)
                .background(SmapPrimary)
                .clickable(onClick = onAdd)
                .padding(horizontal = 28.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        ) {
            Icon(
                imageVector = Icons.Filled.Add,
                contentDescription = null,
                tint = SmapPrimaryForeground,
                modifier = Modifier.size(20.dp),
            )
            Text(
                text = stringResource(R.string.profile_add),
                style = SmapBodyEmphasisStyle,
                color = SmapPrimaryForeground,
            )
        }
    }
}

@Composable
private fun AddCard(onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 180.dp)
            .clickable(onClick = onClick)
            .background(SmapPrimarySoft, RoundedCornerShape(24.dp))
            .padding(vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            imageVector = Icons.Filled.Add,
            contentDescription = null,
            tint = SmapPrimaryForeground,
            modifier = Modifier.size(48.dp),
        )
        Text(stringResource(R.string.profile_add), style = SmapBodyEmphasisStyle, color = SmapPrimaryForeground)
    }
}

private val AvatarChoices = listOf(
    "🦊", "🐰", "🐻", "🐼", "🦁", "🐯",
    "🐨", "🐶", "🐱", "🦄", "⭐️", "🌈",
)

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun CreateProfileSheet(
    error: String?,
    onDismiss: () -> Unit,
    onCreate: (String, Int, String) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState()
    var name by remember { mutableStateOf("") }
    var age by remember { mutableStateOf(7) }
    var avatar by remember { mutableStateOf(AvatarChoices.first()) }
    val canSubmit = name.trim().isNotEmpty()

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = SmapSurface) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Text("새 프로필", style = SmapHeadingStyle, color = SmapText)

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("이름", style = SmapBodyStyle, color = SmapMuted)
                BasicTextField(
                    value = name,
                    onValueChange = { name = it },
                    textStyle = SmapHeadingStyle.copy(color = SmapText),
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SmapPrimarySoft, RoundedCornerShape(14.dp))
                        .padding(14.dp),
                    singleLine = true,
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("나이", style = SmapBodyStyle, color = SmapMuted)
                androidx.compose.foundation.layout.Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    (5..10).forEach { i ->
                        val selected = age == i
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .heightIn(min = 40.dp)
                                .clickable { age = i }
                                .background(
                                    if (selected) SmapPrimary else SmapSurface,
                                    RoundedCornerShape(percent = 50),
                                )
                                .border(
                                    width = if (selected) 0.dp else 1.dp,
                                    color = if (selected) Color.Transparent else SmapBorder,
                                    shape = RoundedCornerShape(percent = 50),
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "${i}세",
                                style = SmapBodyEmphasisStyle,
                                color = if (selected) SmapPrimaryForeground else SmapText,
                            )
                        }
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("프로필 모양", style = SmapBodyStyle, color = SmapMuted)
                LazyVerticalGrid(
                    columns = GridCells.Fixed(6),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.heightIn(min = 120.dp),
                    userScrollEnabled = false,
                ) {
                    items(AvatarChoices) { emoji ->
                        val selected = avatar == emoji
                        Box(
                            modifier = Modifier
                                .heightIn(min = 52.dp)
                                .clickable { avatar = emoji }
                                .background(
                                    if (selected) SmapPrimarySoft else SmapSurface,
                                    CircleShape,
                                )
                                .border(
                                    width = if (selected) 2.dp else 1.dp,
                                    color = if (selected) SmapPrimary else SmapBorder,
                                    shape = CircleShape,
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(text = emoji, style = SmapHeadingStyle)
                        }
                    }
                }
            }

            if (!error.isNullOrBlank()) {
                Text(error, style = SmapBodyStyle, color = SmapDanger)
            }

            PrimaryButton(
                title = "추가하기",
                enabled = canSubmit,
                onClick = { onCreate(name.trim(), age, avatar) },
            )
        }
    }
}
