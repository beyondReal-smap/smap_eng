import SwiftUI

/// 로그인 + 프로필 선택 완료 후의 메인 화면. 4탭 구조.
///
/// - 책장: 가장 깊은 라우팅(Reader/Quiz/CreateBook). 자체 NavigationStack + `path` 보유
/// - 통계 / 단어장: 단일 화면. NavigationStack 만 감싸 타이틀 표시
/// - 설정: SettingsView. 프로필 전환·로그아웃 콜백은 상위로 전파
///
/// 프로필 전환·로그아웃 시 `onResetProfile`을 호출하면 `HomeRouter`가 `selectedProfileId`를 nil로
/// 되돌려 ProfilePickerView로 복귀한다.
struct MainTabView: View {
    let profileId: Int
    var onResetProfile: () -> Void

    @State private var selectedTab: Tab = .bookshelf
    @State private var bookshelfPath = NavigationPath()

    enum Tab: Hashable {
        case bookshelf
        case stats
        case vocab
        case settings
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            bookshelfTab
                .tabItem { Label("책장", systemImage: "books.vertical.fill") }
                .tag(Tab.bookshelf)

            statsTab
                .tabItem { Label("통계", systemImage: "chart.bar.xaxis") }
                .tag(Tab.stats)

            vocabTab
                .tabItem { Label("단어장", systemImage: "character.book.closed") }
                .tag(Tab.vocab)

            settingsTab
                .tabItem { Label("설정", systemImage: "gearshape") }
                .tag(Tab.settings)
        }
        .tint(.smapPrimary)
    }

    // MARK: - 책장 탭

    private var bookshelfTab: some View {
        NavigationStack(path: $bookshelfPath) {
            BookshelfView(
                profileId: profileId,
                onSwitchProfile: { onResetProfile() },
            )
            .navigationDestination(for: Book.self) { book in
                ReaderView(book: book, profileId: profileId)
            }
            .navigationDestination(for: QuizDestination.self) { dest in
                QuizView(book: dest.book, readingLogId: dest.readingLogId) {
                    // Reader/Quiz 둘 다 pop.
                    bookshelfPath = NavigationPath()
                }
            }
            .navigationDestination(for: CreateBookDestination.self) { dest in
                CreateBookFlow(
                    profileId: dest.profileId,
                    onCreated: { book in
                        var newPath = NavigationPath()
                        newPath.append(book)
                        bookshelfPath = newPath
                    },
                    onCancel: { bookshelfPath = NavigationPath() },
                )
            }
        }
    }

    // MARK: - 통계 탭

    private var statsTab: some View {
        NavigationStack {
            StatsDashboardView(profileId: profileId)
        }
    }

    // MARK: - 단어장 탭

    private var vocabTab: some View {
        NavigationStack {
            VocabDeckView(profileId: profileId)
        }
    }

    // MARK: - 설정 탭

    private var settingsTab: some View {
        NavigationStack {
            SettingsView(
                onSwitchProfile: { onResetProfile() },
                onSignOut: { onResetProfile() },
            )
        }
    }
}
