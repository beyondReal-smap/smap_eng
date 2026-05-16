import SwiftUI

/// 웹 `src/app/globals.css` 의 oklch 토큰을 sRGB hex로 매핑.
/// 디자인 시스템 단일 출처 — 모든 화면이 이 토큰을 사용한다.
extension Color {
    // Primary = Soft Coral Peach (oklch(0.82 0.10 35)), Foreground = deep coral ink.
    static let smapPrimary           = Color(hex: 0xFFB39A)   // Soft Coral Peach (CTA 배경)
    static let smapPrimaryForeground = Color(hex: 0x5B2C1F)   // deep coral ink (CTA 텍스트)
    static let smapPrimarySoft       = Color(hex: 0xFFE2D8)   // 파스텔 코랄 (tonal CTA)

    // Surface / 배경
    static let smapBackground = Color(hex: 0xFBFAF9)   // Warm Canvas (페이지 베이스)
    static let smapSurface    = Color(hex: 0xFFFFFF)   // Card / Popover
    static let smapMutedBg    = Color(hex: 0xF2F0ED)   // Stone Surface (secondary/muted)

    // 외곽선
    static let smapBorder     = Color(hex: 0xE9E8E5)   // border / input

    // 타이포그래피
    static let smapText       = Color(hex: 0x343433)   // Charcoal (foreground)
    static let smapMuted      = Color(hex: 0x474645)   // Graphite (muted-foreground)

    // 상태
    static let smapDanger     = Color(hex: 0xC73E1F)   // destructive (rich red)
    static let smapWarn       = Color(hex: 0xE08A1E)

    // 보조 액센트 — 웹 secondary palette (Powder Sky / Gold / Mint / Peach / Rose / Lilac).
    static let smapAccent     = Color(hex: 0xB8D9F0)   // Powder Sky

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
        case .b2: return .smapLevelB2
        }
    }
}
