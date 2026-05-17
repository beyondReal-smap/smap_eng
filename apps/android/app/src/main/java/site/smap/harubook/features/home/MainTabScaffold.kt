package site.smap.harubook.features.home

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import site.smap.harubook.R
import site.smap.harubook.designsystem.SmapBackground
import site.smap.harubook.designsystem.SmapPrimary
import site.smap.harubook.designsystem.SmapPrimaryForeground
import site.smap.harubook.designsystem.SmapPrimarySoft
import site.smap.harubook.features.settings.SettingsScreen
import site.smap.harubook.features.stats.StatsDashboardScreen
import site.smap.harubook.features.vocab.VocabDeckScreen

private enum class HomeTab(val labelRes: Int, val icon: ImageVector) {
    Bookshelf(R.string.tab_bookshelf, Icons.AutoMirrored.Filled.MenuBook),
    Stats(R.string.tab_stats, Icons.Filled.BarChart),
    Vocab(R.string.tab_vocab, Icons.Filled.Translate),
    Settings(R.string.tab_settings, Icons.Filled.Settings),
}

/**
 * iOS `MainTabView.swift` 미러. 4개 탭(책장/통계/단어장/설정) BottomNav.
 * 책장 탭은 호스트(`HomeRouter`)가 NavHost 라우팅을 처리하도록 콘텐츠를 외부 주입한다.
 */
@Composable
fun MainTabScaffold(
    profileId: Int,
    onSwitchProfile: () -> Unit,
    onOpenParents: () -> Unit,
    onOpenStore: () -> Unit,
    bookshelfContent: @Composable () -> Unit,
) {
    // rememberSaveable — NavHost 가 BOOKSHELF_ROUTE 를 다시 그릴 때(예: Settings → Parents 진입 후
    // popBackStack 으로 복귀) 탭 상태가 초기값으로 리셋되지 않도록 보존. 이전엔 remember(profileId)
    // 라 라우트 재진입마다 Bookshelf 탭으로 돌아가버려 "설정에서 뒤로 가면 책장으로 간다" 문제 발생.
    var selectedTab by rememberSaveable(profileId) { mutableStateOf(HomeTab.Bookshelf) }

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = SmapBackground) {
                HomeTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(stringResource(tab.labelRes)) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = SmapPrimaryForeground,
                            selectedTextColor = SmapPrimaryForeground,
                            indicatorColor = SmapPrimarySoft,
                            unselectedIconColor = SmapPrimary,
                            unselectedTextColor = SmapPrimary,
                        ),
                    )
                }
            }
        },
        containerColor = SmapBackground,
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(SmapBackground),
        ) {
            // iOS TabView 패리티: 탭 사이를 짧은 cross-fade 로 부드럽게 연결. 이전엔 when 분기로
            // 즉시 교체라 탭 전환이 뚝 끊겨 보였다. 200ms 는 iOS 의 자연스러운 톤과 일치.
            Crossfade(
                targetState = selectedTab,
                animationSpec = tween(durationMillis = 200),
                label = "main-tab",
            ) { tab ->
                when (tab) {
                    HomeTab.Bookshelf -> bookshelfContent()
                    HomeTab.Stats -> StatsDashboardScreen(profileId = profileId)
                    HomeTab.Vocab -> VocabDeckScreen(profileId = profileId)
                    HomeTab.Settings -> SettingsScreen(
                        onSwitchProfile = onSwitchProfile,
                        onOpenParents = onOpenParents,
                        onOpenStore = onOpenStore,
                    )
                }
            }
        }
    }
}
