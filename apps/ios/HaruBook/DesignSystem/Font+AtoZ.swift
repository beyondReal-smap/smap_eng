import SwiftUI

/// 웹 랜딩/메인과 동일한 손글씨 폰트 A2Z(AtoZ). 9 웨이트 중 핵심 3개만 번들된다.
/// `Font.custom`은 PostScript name을 받는다 — 원본 woff2의 PS name이 dash로 시작해
/// SwiftUI에서 매칭되지 않던 문제가 있어, fontTools로 PS name을
/// `A2Z-Regular / A2Z-Bold / A2Z-Black` 으로 표준화한 ttf를 사용한다.
extension Font {
    static func atozRegular(_ size: CGFloat) -> Font {
        Font.custom("A2Z-Regular", size: size)
    }
    static func atozBold(_ size: CGFloat) -> Font {
        Font.custom("A2Z-Bold", size: size)
    }
    static func atozBlack(_ size: CGFloat) -> Font {
        Font.custom("A2Z-Black", size: size)
    }
}
