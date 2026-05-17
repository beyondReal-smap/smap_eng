import SwiftUI

struct BadgeLabel: View {
    let text: String
    var tone: Tone = .neutral

    enum Tone {
        case primary, neutral, warn, danger
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
        }
    }
}
