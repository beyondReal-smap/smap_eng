package site.smap.harubook.features.parents

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapBodyStyle
import site.smap.harubook.designsystem.SmapBorder
import site.smap.harubook.designsystem.SmapCaptionStyle
import site.smap.harubook.designsystem.SmapMuted
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.designsystem.SmapSurface

@Composable
fun WeeklyReportScreen(
    onLock: () -> Unit,
    viewModel: WeeklyReportViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(SmapBackground)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(vertical = 20.dp),
    ) {
        item { StatusBar(onLock) }

        when {
            state.isLoading && state.reports.isEmpty() -> item {
                Box(modifier = Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SmapPrimary)
                }
            }
            !state.error.isNullOrBlank() && state.reports.isEmpty() -> item { EmptyOrError(state.error!!) }
            state.reports.isEmpty() -> item { EmptyOrError("아직 모은 학습 데이터가 없어요.") }
            else -> items(state.reports, key = { it.profileId }) { report -> ProfileReportCard(report) }
        }
    }
}

@Composable
private fun StatusBar(onLock: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier
            .fillMaxWidth()
            .background(SmapSurface, RoundedCornerShape(12.dp))
            .border(1.dp, SmapBorder, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Icon(Icons.Filled.LockOpen, contentDescription = null, tint = SmapPrimary)
        Text("보호자 모드 · 30분 후 자동 잠금", style = SmapCaptionStyle, color = SmapMuted)
        Box(modifier = Modifier.weight(1f))
        Box(
            modifier = Modifier
                .background(SmapPrimarySoft, RoundedCornerShape(percent = 50))
                .clickable(onClick = onLock)
                .padding(horizontal = 10.dp, vertical = 6.dp),
        ) {
            Text("지금 잠그기", style = SmapCaptionStyle, color = SmapPrimaryForeground)
        }
    }
}

@Composable
private fun EmptyOrError(message: String) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(Icons.Filled.Inbox, contentDescription = null, tint = SmapMuted, modifier = Modifier.size(40.dp))
        Text(message, style = SmapBodyStyle, color = SmapMuted, textAlign = TextAlign.Center)
    }
}
