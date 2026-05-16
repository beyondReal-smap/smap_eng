import SwiftUI

/// 로그인 + 프로필 선택 완료 후의 메인 화면. 4탭 구조.
///
/// SwiftUI 기본 `TabView`는 탭 전환 시 시각적 transition이 없다(즉시 교체).
/// 자체 ZStack switch + `.transition(.opacity)` 패턴으로 cross-fade 추가.
/// 하단 탭바는 SwiftUI `Label` 기반 자체 구현 — 글꼴/색을 디자인 시스템과 일치.
struct MainTabView: View {
    let profileId: Int
    /// 책장/설정 어디서든 "프로필 전환" → HomeRouter가 ProfilePickerView 표시.
    var onResetProfile: () -> Void
    /// 설정의 "로그아웃" — 토큰 삭제 + lastProfileId 제거 + LoginView 복귀.
    var onSignOut: () -> Void

    @State private var selectedTab: Tab = .bookshelf
    @State private var bookshelfPath = NavigationPath()

    enum Tab: Hashable {
        case bookshelf
        case stats
        case vocab
        case settings
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.smapBackground.ignoresSafeArea()

            // 콘텐츠 — 탭 전환 시 opacity cross-fade.
            ZStack {
                switch selectedTab {
                case .bookshelf:
                    bookshelfTab.transition(.opacity)
                case .stats:
                    statsTab.transition(.opacity)
                case .vocab:
                    vocabTab.transition(.opacity)
                case .settings:
                    settingsTab.transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.22), value: selectedTab)

            customTabBar
                .padding(.horizontal, 16)
                .padding(.bottom, 4)
        }
    }

    // MARK: - 자체 탭바

    private var customTabBar: some View {
        HStack(spacing: 4) {
            tabButton(.bookshelf, label: "책장", icon: "books.vertical.fill")
            tabButton(.stats, label: "통계", icon: "chart.bar.xaxis")
            tabButton(.vocab, label: "단어장", icon: "character.book.closed")
            tabButton(.settings, label: "설정", icon: "gearshape")
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1),
        )
        .shadow(color: Color.smapText.opacity(0.06), radius: 12, x: 0, y: 4)
    }

    private func tabButton(_ tab: Tab, label: String, icon: String) -> some View {
        let isSelected = selectedTab == tab
        return Button {
            withAnimation(.easeInOut(duration: 0.22)) {
                selectedTab = tab
            }
        } label: {
            VStack(spacing: 3) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: isSelected ? .semibold : .regular))
                Text(label)
                    .font(Font.atozBold(11))
            }
            .frame(maxWidth: .infinity, minHeight: 48)
            .foregroundStyle(isSelected ? Color.smapPrimaryForeground : Color.smapMuted)
            .background(isSelected ? Color.smapPrimarySoft : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    // MARK: - 책장 탭

    private var bookshelfTab: some View {
        NavigationStack(path: $bookshelfPath) {
            BookshelfView(
                profileId: profileId,
                onSwitchProfile: { onResetProfile() },
            )
            .safeAreaInset(edge: .bottom) { tabBarInsetSpacer }
            .navigationDestination(for: Book.self) { book in
                ReaderView(book: book, profileId: profileId)
            }
            .navigationDestination(for: QuizDestination.self) { dest in
                QuizView(book: dest.book, readingLogId: dest.readingLogId) {
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
            .navigationDestination(for: StoreDestination.self) { _ in
                StoreView()
            }
        }
    }

    private var statsTab: some View {
        NavigationStack {
            StatsDashboardView(profileId: profileId)
                .safeAreaInset(edge: .bottom) { tabBarInsetSpacer }
        }
    }

    private var vocabTab: some View {
        NavigationStack {
            VocabDeckView(profileId: profileId)
                .safeAreaInset(edge: .bottom) { tabBarInsetSpacer }
        }
    }

    private var settingsTab: some View {
        NavigationStack {
            SettingsView(
                onSwitchProfile: { onResetProfile() },
                onSignOut: { onSignOut() },
            )
            .safeAreaInset(edge: .bottom) { tabBarInsetSpacer }
        }
    }

    /// 자체 탭바 높이만큼 콘텐츠 하단에 공간을 확보 — 스크롤 영역이 탭바에 가려지지 않게.
    private var tabBarInsetSpacer: some View {
        Color.clear.frame(height: 72)
    }
}
