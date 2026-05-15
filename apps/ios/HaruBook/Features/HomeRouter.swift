import SwiftUI

struct HomeRouter: View {
    @Environment(AuthState.self) private var auth
    @State private var selectedProfileId: Int? = SessionPreferences.shared.lastProfileId
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if let profileId = selectedProfileId {
                    BookshelfView(
                        profileId: profileId,
                        onSwitchProfile: { selectedProfileId = nil; SessionPreferences.shared.lastProfileId = nil }
                    )
                    .navigationDestination(for: Book.self) { book in
                        ReaderView(book: book, profileId: profileId)
                    }
                    .navigationDestination(for: QuizDestination.self) { dest in
                        QuizView(book: dest.book, readingLogId: dest.readingLogId) {
                            // 책장으로 복귀 — Reader/Quiz 둘 다 pop.
                            path = NavigationPath()
                        }
                    }
                    .navigationDestination(for: CreateBookDestination.self) { dest in
                        CreateBookFlow(
                            profileId: dest.profileId,
                            onCreated: { book in
                                // 책장으로 복귀 후 곧바로 새 책으로 진입.
                                var newPath = NavigationPath()
                                newPath.append(book)
                                path = newPath
                            },
                            onCancel: { path = NavigationPath() }
                        )
                    }
                    .navigationDestination(for: StatsDestination.self) { dest in
                        StatsDashboardView(profileId: dest.profileId)
                    }
                    .navigationDestination(for: VocabDestination.self) { dest in
                        VocabDeckView(profileId: dest.profileId)
                    }
                } else {
                    ProfilePickerView { profile in
                        selectedProfileId = profile.id
                        SessionPreferences.shared.lastProfileId = profile.id
                    }
                }
            }
            .toolbar {
                if let profileId = selectedProfileId {
                    ToolbarItem(placement: .topBarLeading) {
                        NavigationLink(value: StatsDestination(profileId: profileId)) {
                            Image(systemName: "chart.bar.xaxis")
                                .font(.title2)
                                .foregroundStyle(Color.smapText)
                        }
                    }
                    ToolbarItem(placement: .topBarLeading) {
                        NavigationLink(value: VocabDestination(profileId: profileId)) {
                            Image(systemName: "character.book.closed")
                                .font(.title2)
                                .foregroundStyle(Color.smapText)
                        }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        SettingsView(
                            onSwitchProfile: {
                                selectedProfileId = nil
                                SessionPreferences.shared.lastProfileId = nil
                            },
                            onSignOut: {
                                selectedProfileId = nil
                                SessionPreferences.shared.lastProfileId = nil
                            },
                        )
                    } label: {
                        Image(systemName: "gearshape")
                            .font(.title2)
                            .foregroundStyle(Color.smapText)
                    }
                }
            }
        }
    }
}

/// 사용자 기본 설정 (프로필 선택 등) — UserDefaults 래퍼.
@MainActor
final class SessionPreferences {
    static let shared = SessionPreferences()

    private let defaults: UserDefaults
    private enum Key {
        static let lastProfileId = "lastProfileId"
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    var lastProfileId: Int? {
        get {
            let value = defaults.integer(forKey: Key.lastProfileId)
            return value > 0 ? value : nil
        }
        set {
            if let value = newValue {
                defaults.set(value, forKey: Key.lastProfileId)
            } else {
                defaults.removeObject(forKey: Key.lastProfileId)
            }
        }
    }
}
