package site.smap.harubook.features.home

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.NavType
import androidx.navigation.navArgument
import java.net.URLDecoder
import java.net.URLEncoder
import site.smap.harubook.features.bookshelf.BookshelfScreen
import site.smap.harubook.features.createbook.CreateBookFlow
import site.smap.harubook.features.profiles.ProfilePickerScreen
import site.smap.harubook.features.quiz.QuizScreen
import site.smap.harubook.features.reader.ReaderScreen

private const val PROFILE_PICKER_ROUTE = "profilePicker"
private const val BOOKSHELF_ROUTE = "bookshelf"
private const val READER_ROUTE = "reader/{bookId}"
private const val QUIZ_ROUTE = "quiz/{bookId}/{title}/{logId}"
private const val CREATE_BOOK_ROUTE = "createBook"

@Composable
fun HomeRouter() {
    val context = LocalContext.current
    val nav = rememberNavController()

    var selectedProfileId by remember {
        mutableStateOf(SessionPreferences.getLastProfileId(context))
    }

    val initialRoute = if (selectedProfileId != null) BOOKSHELF_ROUTE else PROFILE_PICKER_ROUTE

    NavHost(navController = nav, startDestination = initialRoute) {
        composable(PROFILE_PICKER_ROUTE) {
            ProfilePickerScreen(onSelect = { profile ->
                selectedProfileId = profile.id
                SessionPreferences.setLastProfileId(context, profile.id)
                nav.navigate(BOOKSHELF_ROUTE) {
                    popUpTo(PROFILE_PICKER_ROUTE) { inclusive = true }
                }
            })
        }

        composable(BOOKSHELF_ROUTE) {
            val pid = selectedProfileId ?: return@composable
            BookshelfScreen(
                profileId = pid,
                onSwitchProfile = {
                    selectedProfileId = null
                    SessionPreferences.setLastProfileId(context, null)
                    nav.navigate(PROFILE_PICKER_ROUTE) {
                        popUpTo(BOOKSHELF_ROUTE) { inclusive = true }
                    }
                },
                onOpenBook = { bookId ->
                    nav.navigate("reader/$bookId")
                },
                onCreateBook = {
                    nav.navigate(CREATE_BOOK_ROUTE)
                },
            )
        }

        composable(CREATE_BOOK_ROUTE) {
            val pid = selectedProfileId ?: return@composable
            CreateBookFlow(
                profileId = pid,
                onCreated = { book ->
                    nav.navigate("reader/${book.id}") {
                        popUpTo(BOOKSHELF_ROUTE) { inclusive = false }
                        launchSingleTop = true
                    }
                },
                onCancel = { nav.popBackStack() },
            )
        }

        composable(READER_ROUTE) { backStackEntry ->
            val bookId = backStackEntry.arguments?.getString("bookId")?.toIntOrNull() ?: return@composable
            val pid = selectedProfileId ?: return@composable
            ReaderScreen(
                bookId = bookId,
                profileId = pid,
                onBack = { nav.popBackStack() },
                onOpenQuiz = { qBookId, qTitle, qLogId ->
                    val encodedTitle = URLEncoder.encode(qTitle, Charsets.UTF_8.name())
                    val logArg = qLogId?.toString() ?: "0"
                    nav.navigate("quiz/$qBookId/$encodedTitle/$logArg")
                },
            )
        }

        composable(
            route = QUIZ_ROUTE,
            arguments = listOf(
                navArgument("bookId") { type = NavType.IntType },
                navArgument("title") { type = NavType.StringType },
                navArgument("logId") { type = NavType.IntType },
            ),
        ) { backStackEntry ->
            val args = backStackEntry.arguments ?: return@composable
            val bookId = args.getInt("bookId")
            val title = URLDecoder.decode(args.getString("title").orEmpty(), Charsets.UTF_8.name())
            val logIdRaw = args.getInt("logId")
            val readingLogId = if (logIdRaw > 0) logIdRaw else null
            QuizScreen(
                bookId = bookId,
                bookTitle = title,
                readingLogId = readingLogId,
                onClose = {
                    // 책장으로 복귀 — Reader/Quiz 모두 pop.
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
        prefs.edit().run {
            if (value == null) remove(KEY_LAST_PROFILE) else putInt(KEY_LAST_PROFILE, value)
            apply()
        }
    }
}
