import SwiftUI

struct PassageView: View {
    let passage: Passage
    let showsKorean: Bool
    let isPlaying: Bool
    let isPreparing: Bool
    let onTogglePlayback: () -> Void

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

                Button(action: onTogglePlayback) {
                    HStack(spacing: 10) {
                        if isPreparing {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                        }
                        Text(isPlaying ? "일시정지" : (isPreparing ? "준비 중…" : "이 문장 듣기"))
                            .font(.smapBodyEmphasis)
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
                    .background(Color.smapPrimary, in: Capsule())
                }
                .buttonStyle(.plain)

                Text(passage.textEn)
                    .font(.smapReader)
                    .foregroundStyle(Color.smapText)
                    .lineSpacing(8)
                    .padding(12)
                    .background(
                        isPlaying ? Color.smapPrimarySoft : Color.clear,
                        in: RoundedRectangle(cornerRadius: 12)
                    )

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
