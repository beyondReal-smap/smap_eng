import SwiftUI

/// 로그인 후 진입 루트.
///  - 프로필 미선택: ProfilePickerView (탭바 없음, 풀스크린)
///  - 프로필 선택됨: MainTabView (4탭)
///
/// 라우팅 깊이가 깊은 책장 흐름(Reader/Quiz/CreateBook)은 MainTabView의 책장 탭 NavigationStack이
/// 단독으로 관리한다 — 탭 전환과 페이지 이동을 분리해 사용자 경험을 단순화.
struct HomeRouter: View {
    @State private var selectedProfileId: Int? = SessionPreferences.shared.lastProfileId

    var body: some View {
        if let profileId = selectedProfileId {
            MainTabView(
                profileId: profileId,
                onResetProfile: {
                    selectedProfileId = nil
                    SessionPreferences.shared.lastProfileId = nil
                },
            )
        } else {
            ProfilePickerView { profile in
                selectedProfileId = profile.id
                SessionPreferences.shared.lastProfileId = profile.id
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
