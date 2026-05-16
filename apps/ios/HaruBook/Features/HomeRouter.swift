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

    /// MainTabView ↔ ProfilePickerView 사이를 책장 → 리더뷰 push와 동일한 좌우 슬라이드로 연결.
    ///
    /// 두 뷰가 각각 반대 방향으로 고정된 transition을 가지면 ZStack 안에서도 push/pop이 자연스럽게 보인다:
    /// - MainTabView: 항상 leading(좌측)으로 들고남 → 새 화면에 밀려나거나 뒤로가기로 돌아옴
    /// - ProfilePickerView: 항상 trailing(우측)에서 들고남 → push처럼 들어오고 pop처럼 빠짐
    /// 곡선/지속시간은 UIKit `UINavigationController` push와 가까운 0.32s easeInOut.
    var body: some View {
        ZStack {
            if let profileId = selectedProfileId, !switching {
                MainTabView(
                    profileId: profileId,
                    onResetProfile: {
                        // "프로필 전환" — 책장 유지 + ProfilePickerView 띄움. lastProfileId는 보존.
                        withAnimation(.easeInOut(duration: 0.32)) {
                            switching = true
                        }
                    },
                    onSignOut: {
                        withAnimation(.easeInOut(duration: 0.32)) {
                            selectedProfileId = nil
                            switching = false
                            SessionPreferences.shared.lastProfileId = nil
                        }
                    },
                )
                .transition(.move(edge: .leading))
            } else {
                // switching=true 면 이전 책장으로 복귀 가능. lastProfileId가 없으면(첫 로그인)
                // 백 버튼 자체가 생기지 않는다.
                ProfilePickerView(
                    onSelect: { profile in
                        withAnimation(.easeInOut(duration: 0.32)) {
                            selectedProfileId = profile.id
                            SessionPreferences.shared.lastProfileId = profile.id
                            switching = false
                        }
                    },
                    onCancel: switching && selectedProfileId != nil
                        ? {
                            withAnimation(.easeInOut(duration: 0.32)) {
                                switching = false
                            }
                        }
                        : nil,
                )
                .transition(.move(edge: .trailing))
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
