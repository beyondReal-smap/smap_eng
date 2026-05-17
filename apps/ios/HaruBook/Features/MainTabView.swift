import SwiftUI

/// 로그인 + 프로필 선택 완료 후의 메인 화면. 4탭 구조.
///
/// SwiftUI 기본 `TabView`는 탭 전환 시 시각적 transition이 없다(즉시 교체).
/// 자체 ZStack switch + `.transition(.opacity)` 패턴으로 cross-fade 추가.
/// 하단 탭바는 SwiftUI `Label` 기반 자체 구현 — 글꼴/색을 디자인 시스템과 일치.
struct MainTabView: View {
    let profileId: Int
    /// HomeRouter가 매칭해 전달한 현재 프로필 객체. 헤더 등에 이름/아바타 표시용.
    /// 첫 진입 순간에는 nil일 수 있어 호출자는 폴백 처리 필요.
    let currentProfile: Profile?
    /// 책장/설정 어디서든 "프로필 전환" → HomeRouter가 ProfilePickerView 표시.
    var onResetProfile: () -> Void
    /// 설정의 "로그아웃" — 토큰 삭제 + lastProfileId 제거 + LoginView 복귀.
    var onSignOut: () -> Void

    @State private var selectedTab: Tab = .bookshelf
    @State private var bookshelfPath = NavigationPath()
    /// VoiceOver 사용자의 모션 민감도 존중. true면 탭 전환/탭바 노출 애니메이션을 생략.
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    enum Tab: Hashable, CaseIterable {
        case bookshelf
        case stats
        case vocab
        case settings

        /// VoiceOver `accessibilityValue` 용 1-based 인덱스 ("탭 N / 4").
        var position: Int { (Self.allCases.firstIndex(of: self) ?? 0) + 1 }
    }

    /// 책장에서 destination이 push되면(예: ReaderView/QuizView/StoreView) 자체 탭바를 숨겨
    /// 콘텐츠가 풀스크린을 사용하고 하단 컨트롤바가 가려지지 않게 한다. (몰입 모드)
    private var hidesTabBar: Bool {
        selectedTab == .bookshelf && !bookshelfPath.isEmpty
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
            .animation(reduceMotion ? nil : .easeInOut(duration: 0.22), value: selectedTab)

            if !hidesTabBar {
                customTabBar
                    .padding(.horizontal, 16)
                    .padding(.bottom, 4)
                    .transition(reduceMotion ? .identity : .move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.22), value: hidesTabBar)
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
            if !isSelected {
                Haptic.play(.lightTap)
            }
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.22)) {
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
        // 표준 TabView가 자동으로 부여하는 "tab N of 4, selected" 트레이트를 커스텀 Button에 명시 부여.
        // 없으면 VoiceOver는 "책장, 버튼"만 읽어 탭 컨테이너인지/현재 어느 탭인지 알 수 없다.
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
        .accessibilityValue("탭 \(tab.position) / \(Tab.allCases.count)")
        .accessibilityHint(isSelected ? "" : "두 번 탭하여 \(label) 화면으로 이동")
    }

    // MARK: - 책장 탭

    private var bookshelfTab: some View {
        NavigationStack(path: $bookshelfPath) {
            BookshelfView(
                profileId: profileId,
                currentProfile: currentProfile,
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
                    ageHint: dest.ageHint,
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
