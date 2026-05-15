import SwiftUI

extension Color {
    static let smapPrimary    = Color(hex: 0x1D5B53)   // 진녹색 — CTA / 버튼
    static let smapPrimarySoft = Color(hex: 0xE6F0EE)
    static let smapBackground = Color(hex: 0xFFF7E8)   // 크림 배경
    static let smapSurface    = Color(hex: 0xFFFFFF)
    static let smapBorder     = Color(hex: 0xE8D9BD)
    static let smapText       = Color(hex: 0x1F2933)
    static let smapMuted      = Color(hex: 0x6B7280)
    static let smapDanger     = Color(hex: 0xC0392B)
    static let smapWarn       = Color(hex: 0xE08A1E)

    // CEFR 레벨 배지 — 웹 `--level-{a1,a2,b1,b2}` 토큰 미러.
    static let smapLevelA1    = Color(hex: 0xC8E6C9)
    static let smapLevelA2    = Color(hex: 0xBBDEFB)
    static let smapLevelB1    = Color(hex: 0xFFE0B2)
    static let smapLevelB2    = Color(hex: 0xF8BBD0)
}

extension CefrLevel {
    /// 레벨별 배지/바 배경색.
    var color: Color {
        switch self {
        case .a1: return .smapLevelA1
        case .a2: return .smapLevelA2
        case .b1: return .smapLevelB1
        }
    }
}
