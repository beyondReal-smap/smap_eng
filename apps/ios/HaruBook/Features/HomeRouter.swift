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
                } else {
                    ProfilePickerView { profile in
                        selectedProfileId = profile.id
                        SessionPreferences.shared.lastProfileId = profile.id
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button(role: .destructive) {
                            auth.signOut()
                            selectedProfileId = nil
                            SessionPreferences.shared.lastProfileId = nil
                        } label: {
                            Label("로그아웃", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } label: {
                        Image(systemName: "person.circle")
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
