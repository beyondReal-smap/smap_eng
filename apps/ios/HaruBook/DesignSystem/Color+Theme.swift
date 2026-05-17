import SwiftUI

/// 웹 `src/app/globals.css` 의 oklch 토큰을 라이트/다크 적응형 sRGB hex 쌍으로 매핑.
/// 디자인 시스템 단일 출처 — 모든 화면이 이 토큰을 사용한다.
///
/// 다크 매핑은 라이트 hue 유지 + lightness 반전 기반 **보수적 안**.
/// 디자이너 정밀 검수 시 두 번째 hex 인자만 조정하면 된다.
extension Color {
    // MARK: - Primary (Soft Coral Peach)
    // 브랜드 코랄(oklch 0.82 0.10 35)은 라이트/다크 양쪽에서 가독성 충분 — 동일 유지.
    static let smapPrimary = Color(hex: 0xFFB39A)
    static let smapPrimaryForeground = Color(
        light: Color(hex: 0x5B2C1F),  // deep coral ink (코랄 배경 위)
        dark:  Color(hex: 0x3D1A0F),  // 더 진한 코랄 잉크
    )
    static let smapPrimarySoft = Color(
        light: Color(hex: 0xFFE2D8),  // 파스텔 코랄 (tonal CTA)
        dark:  Color(hex: 0x4A2D26),  // 어두운 코랄 톤
    )

    // MARK: - Surface / 배경
    static let smapBackground = Color(
        light: Color(hex: 0xFBFAF9),  // Warm Canvas (페이지 베이스)
        dark:  Color(hex: 0x1A1817),  // Warm Charcoal — 따뜻한 톤 유지
    )
    static let smapSurface = Color(
        light: Color(hex: 0xFFFFFF),  // Card / Popover
        dark:  Color(hex: 0x252220),  // Card Charcoal
    )
    static let smapMutedBg = Color(
        light: Color(hex: 0xF2F0ED),  // Stone Surface (secondary/muted)
        dark:  Color(hex: 0x2D2A28),
    )

    // MARK: - 외곽선
    static let smapBorder = Color(
        light: Color(hex: 0xE9E8E5),
        dark:  Color(hex: 0x3A3735),  // 다크 배경 위에 보일 정도의 미묘한 경계
    )

    // MARK: - 타이포그래피
    static let smapText = Color(
        light: Color(hex: 0x343433),  // Charcoal (foreground)
        dark:  Color(hex: 0xE8E7E3),  // Warm Off-White
    )
    static let smapMuted = Color(
        light: Color(hex: 0x474645),  // Graphite (muted-foreground)
        dark:  Color(hex: 0xA8A6A2),  // Mid Gray
    )

    // MARK: - 상태
    static let smapDanger = Color(
        light: Color(hex: 0xC73E1F),  // destructive (rich red)
        dark:  Color(hex: 0xE85C3A),  // 다크에서 가독성 위해 명도 ↑
    )
    static let smapWarn = Color(
        light: Color(hex: 0xE08A1E),
        dark:  Color(hex: 0xEDA850),
    )

    // MARK: - 보조 액센트 — 웹 secondary palette
    static let smapAccent = Color(
        light: Color(hex: 0xB8D9F0),  // Powder Sky (--sky)
        dark:  Color(hex: 0x5B83A6),
    )
    static let smapGold = Color(
        light: Color(hex: 0xF6CE73),  // (--gold oklch 0.82 0.15 84)
        dark:  Color(hex: 0xB8973D),
    )
    static let smapMint = Color(
        light: Color(hex: 0xB6E5D0),  // (--mint oklch 0.88 0.07 160)
        dark:  Color(hex: 0x5BA683),
    )
    static let smapPeach = Color(
        light: Color(hex: 0xF7CFAE),  // (--peach oklch 0.88 0.08 42)
        dark:  Color(hex: 0xB88B60),
    )
    static let smapRose = Color(
        light: Color(hex: 0xF1BBC1),  // (--rose oklch 0.86 0.08 18)
        dark:  Color(hex: 0xB37076),
    )
    static let smapLilac = Color(
        light: Color(hex: 0xD2B8E5),  // (--lilac oklch 0.84 0.07 300)
        dark:  Color(hex: 0x8669A6),
    )

    // MARK: - CEFR 레벨 배지 — 웹 `--level-{a1,a2,b1,b2}` 토큰 미러
    static let smapLevelA1 = Color(
        light: Color(hex: 0xC8E6C9),
        dark:  Color(hex: 0x4A7A4D),
    )
    static let smapLevelA2 = Color(
        light: Color(hex: 0xBBDEFB),
        dark:  Color(hex: 0x4972A3),
    )
    static let smapLevelB1 = Color(
        light: Color(hex: 0xFFE0B2),
        dark:  Color(hex: 0xA68043),
    )
    static let smapLevelB2 = Color(
        light: Color(hex: 0xF8BBD0),
        dark:  Color(hex: 0xA84F70),
    )
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
