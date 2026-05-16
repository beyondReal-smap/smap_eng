import SwiftUI

/// 로그인 후 진입 루트.
///  - 프로필 미선택: ProfilePickerView (탭바 없음, 풀스크린)
///  - 프로필 선택됨: MainTabView (4탭)
///
/// 책장에서 "프로필 전환" 호출 → `switching = true`로 ProfilePickerView 표시.
/// 이때 `lastProfileId`는 그대로 보존해 사용자가 뒤로가기 시 같은 책장으로 복귀.
struct HomeRouter: View {
    @State private var selectedProfileId: Int? = SessionPreferences.shared.lastProfileId
    @State private var switching: Bool = false

    /// MainTabView ↔ ProfilePickerView 사이를 if/else로 즉시 교체하면 화면이 깜빡 점프하는 인상.
    /// ZStack + opacity transition + animation으로 cross-fade를 부드럽게 처리.
    /// 탭 전환과 동일한 0.22s easeInOut 곡선을 사용해 모션 톤을 통일.
    var body: some View {
        ZStack {
            if let profileId = selectedProfileId, !switching {
                MainTabView(
                    profileId: profileId,
                    onResetProfile: {
                        // "프로필 전환" — 책장 유지 + ProfilePickerView 띄움. lastProfileId는 보존.
                        withAnimation(.easeInOut(duration: 0.22)) {
                            switching = true
                        }
                    },
                    onSignOut: {
                        withAnimation(.easeInOut(duration: 0.22)) {
                            selectedProfileId = nil
                            switching = false
                            SessionPreferences.shared.lastProfileId = nil
                        }
                    },
                )
                .transition(.opacity)
            } else {
                // switching=true 면 이전 책장으로 복귀 가능. lastProfileId가 없으면(첫 로그인)
                // 백 버튼 자체가 생기지 않는다.
                ProfilePickerView(
                    onSelect: { profile in
                        withAnimation(.easeInOut(duration: 0.22)) {
                            selectedProfileId = profile.id
                            SessionPreferences.shared.lastProfileId = profile.id
                            switching = false
                        }
                    },
                    onCancel: switching && selectedProfileId != nil
                        ? {
                            withAnimation(.easeInOut(duration: 0.22)) {
                                switching = false
                            }
                        }
                        : nil,
                )
                .transition(.opacity)
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
