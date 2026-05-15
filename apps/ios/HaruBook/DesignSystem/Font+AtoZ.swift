import SwiftUI

/// 웹 랜딩/메인과 동일한 손글씨 폰트 A2Z(AtoZ). 9 웨이트 중 핵심 3개만 번들된다.
/// 각 weight가 독립 family로 등록돼 있어 family name으로 호출한다 (SwiftUI Font.custom).
extension Font {
    static func atozRegular(_ size: CGFloat) -> Font {
        Font.custom("A2Z 4 Regular", size: size)
    }
    static func atozBold(_ size: CGFloat) -> Font {
        Font.custom("A2Z 7 Bold", size: size)
    }
    static func atozBlack(_ size: CGFloat) -> Font {
        Font.custom("A2Z 9 Black", size: size)
    }
}
