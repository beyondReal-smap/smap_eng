package site.smap.harubook.features.home

import android.content.Context
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import site.smap.harubook.core.models.Profile
import site.smap.harubook.core.models.ProfilesResponse
import site.smap.harubook.core.networking.ApiClient
import site.smap.harubook.features.bookshelf.BookshelfScreen
import site.smap.harubook.features.createbook.CreateBookFlow
import site.smap.harubook.features.parents.ParentalPinGateScreen
import site.smap.harubook.features.profiles.ProfilePickerScreen
import site.smap.harubook.features.quiz.QuizScreen
import site.smap.harubook.features.reader.ReaderScreen
import site.smap.harubook.features.store.StoreScreen

private const val PROFILE_PICKER_ROUTE = "profilePicker"
private const val BOOKSHELF_ROUTE = "bookshelf"
private const val READER_ROUTE = "reader/{bookId}"
private const val QUIZ_ROUTE = "quiz/{bookId}/{logId}"
private const val CREATE_BOOK_ROUTE = "createBook"
private const val PARENTS_ROUTE = "parents"
private const val STORE_ROUTE = "store"

@Composable
fun HomeRouter() {
    val context = LocalContext.current
    val nav = rememberNavController()

    /**
     * 선택된 프로필 (id + age 까지 보관). 콜드 스타트 시 SessionPreferences 의 id 로
     * `/api/profiles` 한 번 조회해 채운다 — age 가 책 생성 시 LLM 프롬프트로 전달되어야 함.
     */
    var selectedProfile by remember { mutableStateOf<Profile?>(null) }

    LaunchedEffect(Unit) {
        val lastId = SessionPreferences.getLastProfileId(context) ?: return@LaunchedEffect
        if (selectedProfile?.id == lastId) return@LaunchedEffect
        runCatching {
            val response: ProfilesResponse = ApiClient.get("/api/profiles")
            response.profiles.firstOrNull { it.id == lastId }
        }.getOrNull()?.let { selectedProfile = it }
    }

    val initialRoute = if (selectedProfile != null) BOOKSHELF_ROUTE else PROFILE_PICKER_ROUTE

    // iOS NavigationStack push 패리티: 새 화면은 우→좌로 슬라이드 인, 이전 화면은
    // 살짝 좌로 밀리며 페이드. 뒤로 갈 때는 반대. 350ms easeOut 톤이 iOS 와 가장 유사.
    // 이전엔 Compose Navigation 기본(즉시 교체)이라 화면 전환이 뚝 끊기는 느낌이었다.
    NavHost(
        navController = nav,
        startDestination = initialRoute,
        enterTransition = {
            slideInHorizontally(animationSpec = tween(350)) { it } + fadeIn(tween(350))
        },
        exitTransition = {
            slideOutHorizontally(animationSpec = tween(350)) { -it / 3 } + fadeOut(tween(350))
        },
        popEnterTransition = {
            slideInHorizontally(animationSpec = tween(350)) { -it / 3 } + fadeIn(tween(350))
        },
        popExitTransition = {
            slideOutHorizontally(animationSpec = tween(350)) { it } + fadeOut(tween(350))
        },
    ) {
        composable(PROFILE_PICKER_ROUTE) {
            ProfilePickerScreen(onSelect = { profile ->
                selectedProfile = profile
                SessionPreferences.setLastProfileId(context, profile.id)
                nav.navigate(BOOKSHELF_ROUTE) {
                    popUpTo(PROFILE_PICKER_ROUTE) { inclusive = true }
                }
            })
        }

        composable(BOOKSHELF_ROUTE) {
            val profile = selectedProfile ?: return@composable
            val gotoPicker = {
                selectedProfile = null
                SessionPreferences.setLastProfileId(context, null)
                nav.navigate(PROFILE_PICKER_ROUTE) {
                    popUpTo(BOOKSHELF_ROUTE) { inclusive = true }
                }
            }
            MainTabScaffold(
                profileId = profile.id,
                onSwitchProfile = gotoPicker,
                onOpenParents = { nav.navigate(PARENTS_ROUTE) },
                onOpenStore = { nav.navigate(STORE_ROUTE) },
                bookshelfContent = {
                    BookshelfScreen(
                        profileId = profile.id,
                        currentProfile = profile,
                        onSwitchProfile = gotoPicker,
                        onOpenBook = { bookId -> nav.navigate("reader/$bookId") },
                        onCreateBook = { nav.navigate(CREATE_BOOK_ROUTE) },
                    )
                },
            )
        }

        composable(PARENTS_ROUTE) {
            ParentalPinGateScreen(onBack = { nav.popBackStack() })
        }

        composable(STORE_ROUTE) {
            StoreScreen(onBack = { nav.popBackStack() })
        }

        composable(CREATE_BOOK_ROUTE) {
            val profile = selectedProfile ?: return@composable
            CreateBookFlow(
                profileId = profile.id,
                ageHint = profile.age,
                onCreated = { book ->
                    nav.navigate("reader/${book.id}") {
                        popUpTo(BOOKSHELF_ROUTE) { inclusive = false }
                        launchSingleTop = true
                    }
                },
                onCancel = { nav.popBackStack() },
            )
        }

        composable(
            route = READER_ROUTE,
            arguments = listOf(navArgument("bookId") { type = NavType.IntType }),
        ) { backStackEntry ->
            val bookId = backStackEntry.arguments?.getInt("bookId") ?: return@composable
            val profile = selectedProfile ?: return@composable
            ReaderScreen(
                bookId = bookId,
                profileId = profile.id,
                onBack = { nav.popBackStack() },
                onOpenQuiz = { qBookId, qLogId ->
                    val logArg = qLogId?.toString() ?: "0"
                    nav.navigate("quiz/$qBookId/$logArg")
                },
            )
        }

        composable(
            route = QUIZ_ROUTE,
            arguments = listOf(
                navArgument("bookId") { type = NavType.IntType },
                navArgument("logId") { type = NavType.IntType },
            ),
        ) { backStackEntry ->
            val args = backStackEntry.arguments ?: return@composable
            val bookId = args.getInt("bookId")
            val logRaw = args.getInt("logId")
            QuizScreen(
                bookId = bookId,
                readingLogId = if (logRaw > 0) logRaw else null,
                onClose = {
                    nav.navigate(BOOKSHELF_ROUTE) {
                        popUpTo(BOOKSHELF_ROUTE) { inclusive = false }
                        launchSingleTop = true
                    }
                },
            )
        }
    }
}

object SessionPreferences {
    private const val FILE = "harubook_session"
    private const val KEY_LAST_PROFILE = "lastProfileId"

    fun getLastProfileId(context: Context): Int? {
        val prefs = context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)
        val v = prefs.getInt(KEY_LAST_PROFILE, 0)
        return if (v > 0) v else null
    }

    fun setLastProfileId(context: Context, value: Int?) {
        val prefs = context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)
        prefs.edit().apply {
            if (value == null) remove(KEY_LAST_PROFILE) else putInt(KEY_LAST_PROFILE, value)
            apply()
        }
    }
}
