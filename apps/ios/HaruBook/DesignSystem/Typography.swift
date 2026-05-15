import SwiftUI

/// 앱 전체 타이포그래피 토큰. 웹 랜딩/메인과 동일한 손글씨 폰트 A2Z(에이투지)에 매핑한다.
/// 모든 화면이 `Font.smapXxx`를 쓰는 한 화면별 개별 수정 없이 A2Z가 일괄 적용된다.
///
/// 크기는 시스템 폰트 시절과 비교해 손글씨 폰트의 시각적 무게/높이 차이를 보정해 살짝 키운다.
extension Font {
    static let smapDisplay      = Font.atozBlack(34)
    static let smapTitle        = Font.atozBlack(26)
    static let smapHeading      = Font.atozBold(22)
    static let smapBody         = Font.atozRegular(17)
    static let smapBodyEmphasis = Font.atozBold(17)
    static let smapCaption      = Font.atozRegular(13)
    static let smapBadge        = Font.atozBold(12)
    static let smapReader       = Font.atozRegular(22)
}
