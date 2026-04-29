import SwiftUI

struct PassageView: View {
    let passage: Passage
    let showsKorean: Bool
    let pageNumber: Int
    let totalPages: Int

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if let path = passage.sceneImagePath, !path.isEmpty {
                    AuthenticatedAsyncImage(
                        path: path,
                        placeholder: { ScenePlaceholder(isLoading: true) },
                        failure: { ScenePlaceholder(isLoading: false) }
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                }

                Text(passage.textEn)
                    .font(.smapReader)
                    .foregroundStyle(Color.smapText)
                    .lineSpacing(8)

                if showsKorean, let textKo = passage.textKo, !textKo.isEmpty {
                    Divider().background(Color.smapBorder)
                    Text(textKo)
                        .font(.smapBody)
                        .foregroundStyle(Color.smapMuted)
                        .lineSpacing(6)
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollIndicators(.hidden)
    }
}

private struct ScenePlaceholder: View {
    let isLoading: Bool

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.smapPrimarySoft, Color.smapBackground],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            if isLoading {
                ProgressView().tint(Color.smapPrimary)
            } else {
                Image(systemName: "photo.on.rectangle.angled")
                    .font(.system(size: 36))
                    .foregroundStyle(Color.smapPrimary.opacity(0.5))
            }
        }
    }
}
