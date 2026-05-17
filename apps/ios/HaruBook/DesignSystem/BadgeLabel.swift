import SwiftUI

struct BadgeLabel: View {
    let text: String
    var tone: Tone = .neutral

    enum Tone {
        case primary, neutral, warn, danger
        /// 통계 LevelRow / 책장 필터 칩과 동일한 레벨별 파스텔(A1 초록, A2 파랑, B1 주황, B2 분홍).
        /// CEFR 배지를 앱 전반에서 한 가지 색 체계로 통일하기 위한 톤. 이전엔 책 카드/리더는 코랄(.primary),
        /// 통계는 레벨 색으로 갈려 사용자가 "안 맞다"고 지적했다.
        case level(CefrLevel)
    }

    var body: some View {
        Text(text)
            .font(.smapBadge)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(background)
            .foregroundStyle(foreground)
            .clipShape(Capsule())
    }

    private var background: Color {
        switch tone {
        case .primary: return .smapPrimary
        case .neutral: return Color.smapText.opacity(0.08)
        case .warn: return Color.smapWarn.opacity(0.18)
        case .danger: return Color.smapDanger.opacity(0.18)
        case .level(let lvl): return lvl.color
        }
    }

    private var foreground: Color {
        switch tone {
        // Soft Coral Peach(#FFB39A) 배경 위 흰글씨는 WCAG 대비 ~1.7:1로 AA 미달.
        // 디자인 시스템의 deep coral ink(#5B2C1F)로 변경해 ~6:1 대비 확보.
        case .primary: return .smapPrimaryForeground
        case .neutral: return .smapText
        case .warn: return .smapWarn
        case .danger: return .smapDanger
        // 레벨 파스텔(밝은 톤) 위에는 본문 텍스트 색이 충분한 대비를 가진다.
        case .level: return .smapText
        }
    }
}
