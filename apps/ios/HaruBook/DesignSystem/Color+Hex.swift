import SwiftUI
import UIKit

extension Color {
    /// `0xRRGGBB` 정수 리터럴로부터 sRGB 컬러를 생성한다.
    init(hex: UInt32, alpha: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }

    /// 라이트/다크 한 쌍으로 적응형 색을 정의. iOS는 trait collection 변경 시 자동으로
    /// 적절한 색을 선택해 라이트/다크/Increase Contrast 등을 단일 토큰으로 처리한다.
    /// Asset Catalog `.colorset` 없이도 코드 한 곳에서 색을 관리 — 디자이너 검수 후
    /// 두 번째 hex 인자만 바꾸면 다크 팔레트가 갱신된다.
    init(light: Color, dark: Color) {
        self.init(uiColor: UIColor { trait in
            switch trait.userInterfaceStyle {
            case .dark:
                return UIColor(dark)
            default:
                return UIColor(light)
            }
        })
    }
}
