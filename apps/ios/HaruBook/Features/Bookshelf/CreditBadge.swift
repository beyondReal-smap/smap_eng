import SwiftUI

/// 책장 헤더에 별 잔액을 표시하는 작은 배지. 로딩/에러 시에는 placeholder.
struct CreditBadge: View {
    let balance: Int?

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "star.fill")
                .foregroundStyle(Color.smapWarn)
            Text(balance.map(String.init) ?? "—")
                .font(.smapBodyEmphasis)
                .foregroundStyle(Color.smapText)
                .monospacedDigit()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.smapSurface, in: Capsule())
        .overlay(Capsule().stroke(Color.smapBorder, lineWidth: 1))
    }
}
