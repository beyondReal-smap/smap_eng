import SwiftUI

struct GenrePickerStep: View {
    let onSelect: (CreateBookViewModel.Genre) -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("어떤 종류의 책을 만들까요?")
                        .font(.smapTitle)
                        .foregroundStyle(Color.smapText)
                    Text("좋아하는 쪽을 골라주세요.")
                        .font(.smapBody)
                        .foregroundStyle(Color.smapMuted)
                }

                VStack(spacing: 12) {
                    ForEach(CreateBookViewModel.Genre.allCases) { genre in
                        Button { onSelect(genre) } label: {
                            HStack(spacing: 16) {
                                Image(systemName: genre == .fiction ? "sparkles" : "lightbulb.fill")
                                    .font(.system(size: 28))
                                    .foregroundStyle(Color.smapPrimary)
                                    .frame(width: 56, height: 56)
                                    .background(Color.smapPrimarySoft, in: Circle())
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(genre.label)
                                        .font(.smapBodyEmphasis)
                                        .foregroundStyle(Color.smapText)
                                    Text(genre.description)
                                        .font(.smapCaption)
                                        .foregroundStyle(Color.smapMuted)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundStyle(Color.smapMuted)
                            }
                            .padding(18)
                            .background(Color.smapSurface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 20, style: .continuous)
                                    .stroke(Color.smapBorder, lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
    }
}
