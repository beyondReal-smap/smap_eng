import SwiftUI

/// 컴패니언 상태 계약 — 웹 `vocab-deck/companion.tsx`의 CompanionState 미러.
enum CompanionState: String, Sendable {
    case idle
    case correct
    case wrong
    case celebrate
}

/// 단어장 학습 컴패니언 — 이모지 스텁. 웹 `companion.tsx` 미러 (iOS/AOS 패리티).
///
/// 렌더만 담당하는 프레젠테이션 뷰: 상태 전이(정답/오답/축하 → idle 복귀 타이머)는
/// VocabViewModel이 소유한다. 추후 캐릭터 에셋으로 승격할 때 이 파일 내부만 교체하면
/// 되도록 상태 계약(CompanionState)을 고정해 둔다.
///
/// 톤: 오답도 격려만 한다 — 압박/결핍 문구 금지.
struct VocabCompanionView: View {
    let state: CompanionState
    /// 같은 state가 연속돼도 연출·문구가 갱신되도록 하는 카운터.
    let pulse: Int

    @State private var faceScale: CGFloat = 1

    var body: some View {
        HStack(spacing: 10) {
            Text(face)
                .font(.system(size: 24))
                .frame(width: 44, height: 44)
                .background(Color.smapSurface, in: Circle())
                .overlay(Circle().stroke(Color.smapBorder, lineWidth: 1.5))
                .scaleEffect(faceScale)

            Text(message)
                .font(Font.atozBold(14))
                .foregroundStyle(Color.smapText)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Color.smapSurface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color.smapBorder, lineWidth: 1),
                )

            Spacer(minLength: 0)
        }
        .onChange(of: reactionKey) {
            guard state != .idle else { return }
            // 상태 전환 시 가벼운 바운스 — 즉시 축소 후 스프링 복귀(웹 bounce-in 대응).
            faceScale = 0.7
            withAnimation(.spring(response: 0.35, dampingFraction: 0.5)) {
                faceScale = 1
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(message)
    }

    /// 상태+펄스 조합 키 — 어느 쪽이 바뀌어도 바운스가 다시 재생되게(웹 key 재마운트 대응).
    private var reactionKey: String { "\(state.rawValue)-\(pulse)" }

    private var face: String {
        switch state {
        case .idle: return "🦉"
        case .correct: return "🥳"
        case .wrong: return "🤗"
        case .celebrate: return "🎉"
        }
    }

    /// 상태별 문구 — 웹 companion.tsx의 MESSAGES와 동일하게 유지할 것.
    private var messages: [String] {
        switch state {
        case .idle:
            return ["같이 외워 볼까?", "준비되면 카드를 눌러 봐!", "오늘도 반가워!"]
        case .correct:
            return ["잘했어!", "대단한걸?", "좋아, 하나 더!", "척척박사네!"]
        case .wrong:
            return ["괜찮아, 다시 만나면 기억날 거야!", "어려운 단어야. 한 번 더 보자!", "천천히 해도 돼!"]
        case .celebrate:
            return ["와, 정말 멋져! 🏅", "오늘의 주인공이야!", "최고야, 축하해!"]
        }
    }

    /// pulse 기반 순환 — 연속 같은 상태에서도 문구가 바뀐다(웹과 동일한 규칙).
    private var message: String {
        let list = messages
        return list[pulse % list.count]
    }
}
