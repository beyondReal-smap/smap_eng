import SwiftUI

struct LevelFilterView: View {
    @Binding var selectedAge: Int?
    @Binding var selectedCefr: CefrLevel?
    let onChange: () -> Void

    private static let ages: [Int] = Array(5...10)

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Text("연령").font(.smapCaption).foregroundStyle(Color.smapMuted)
                Spacer()
                if selectedAge != nil || selectedCefr != nil {
                    Button("필터 초기화") {
                        selectedAge = nil
                        selectedCefr = nil
                        onChange()
                    }
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapPrimary)
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Self.ages, id: \.self) { age in
                        FilterChip(
                            title: "\(age)세",
                            isSelected: selectedAge == age
                        ) {
                            selectedAge = (selectedAge == age) ? nil : age
                            onChange()
                        }
                    }
                }
            }

            HStack(spacing: 8) {
                Text("레벨").font(.smapCaption).foregroundStyle(Color.smapMuted)
                Spacer()
            }

            HStack(spacing: 8) {
                ForEach(CefrLevel.allCases) { cefr in
                    FilterChip(
                        title: cefr.label,
                        isSelected: selectedCefr == cefr
                    ) {
                        selectedCefr = (selectedCefr == cefr) ? nil : cefr
                        onChange()
                    }
                }
            }
        }
    }
}

private struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.smapBadge)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? Color.smapPrimary : Color.smapSurface)
                .foregroundStyle(isSelected ? .white : Color.smapText)
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(Color.smapBorder, lineWidth: isSelected ? 0 : 1)
                )
        }
        .buttonStyle(.plain)
    }
}
