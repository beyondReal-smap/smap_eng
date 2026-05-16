import SwiftUI
import UIKit

/// 햅틱 트리거 유형. SwiftUI 17+의 `.sensoryFeedback`로 매핑되며, 호출처에서는
/// `.haptic(.success, trigger: id)` 같은 형태로 한 줄에 표현된다.
enum HapticEvent: Equatable {
    /// 단어 평가 "알아요" / 마스터 / 결제 성공 / 퀴즈 정답 — 가장 강한 성취감.
    case success
    /// 단어 평가 "몰라요" — 가벼운 경고 톤. 부정적 인상은 주지 않게 warning 사용.
    case warning
    /// 네트워크 실패 / 퀴즈 오답 — 분명한 실패 시그널.
    case error
    /// 카드 flip / 페이지 넘김 / 탭 전환 / 버튼 탭 — 가벼운 톤.
    case lightTap
    /// 토글 ON 같은 명확한 중간 강도 피드백.
    case mediumTap
}

extension View {
    /// 트리거 값이 바뀔 때마다 햅틱 발생. SwiftUI iOS 17+ `.sensoryFeedback`을 단일 진입점으로 감싸
    /// `HapticEvent`만으로 일관된 표현 + 콜사이트 가독성 확보.
    func haptic<V: Equatable>(_ event: HapticEvent, trigger: V) -> some View {
        sensoryFeedback(trigger: trigger) { _, _ in
            event.sensoryFeedback
        }
    }
}

private extension HapticEvent {
    /// SwiftUI `SensoryFeedback`으로 매핑.
    var sensoryFeedback: SensoryFeedback {
        switch self {
        case .success:   return .success
        case .warning:   return .warning
        case .error:     return .error
        case .lightTap:  return .impact(weight: .light)
        case .mediumTap: return .impact(weight: .medium)
        }
    }
}

/// 명시적 호출이 필요한 경우(스코프 밖에서 즉시 발생) — UIKit 직접 호출.
/// SwiftUI 트리거 모디파이어가 자연스러운 흐름이 어려울 때만 사용한다.
enum Haptic {
    @MainActor
    static func play(_ event: HapticEvent) {
        switch event {
        case .success:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case .warning:
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case .error:
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        case .lightTap:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .mediumTap:
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        }
    }
}
