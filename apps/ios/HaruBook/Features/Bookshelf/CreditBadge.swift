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
        .padding(.horizontal, 14)
        // 옆의 "새 동화 만들기" CTA(`minHeight: 48`)와 시각적 정렬을 맞추기 위해 높이 통일.
        // 기존 vertical 8pt만으로는 38pt 정도라 CTA가 더 커 보여 단차가 생겼다.
        .frame(minHeight: 48)
        .background(Color.smapSurface, in: Capsule())
        .overlay(Capsule().stroke(Color.smapBorder, lineWidth: 1))
    }
}
