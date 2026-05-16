import SwiftUI

/// 레벨(CEFR) 필터 — A1/A2/B1/B2 4종 칩. 연령 필터는 제거됨(레벨만으로 충분).
struct LevelFilterView: View {
    @Binding var selectedCefr: CefrLevel?
    let onChange: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Text("레벨")
                    .font(Font.atozBold(13))
                    .foregroundStyle(Color.smapMuted)
                Spacer()
                if selectedCefr != nil {
                    Button("초기화") {
                        selectedCefr = nil
                        onChange()
                    }
                    .font(Font.atozBold(13))
                    .foregroundStyle(Color.smapPrimaryForeground)
                }
            }

            HStack(spacing: 8) {
                ForEach(CefrLevel.allCases) { cefr in
                    FilterChip(
                        title: cefr.label,
                        tint: cefr.color,
                        isSelected: selectedCefr == cefr,
                    ) {
                        selectedCefr = (selectedCefr == cefr) ? nil : cefr
                        onChange()
                    }
                }
                Spacer()
            }
        }
    }
}

/// 선택 시 레벨 컬러(파스텔)로 채움 → 단색 코랄 일관 사용에서 벗어나 웹 톤에 더 가까움.
private struct FilterChip: View {
    let title: String
    let tint: Color
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(Font.atozBold(13))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? tint : Color.smapSurface)
                .foregroundStyle(Color.smapText)
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(
                        isSelected ? Color.clear : Color.smapBorder,
                        lineWidth: 1,
                    ),
                )
        }
        .buttonStyle(.plain)
    }
}
