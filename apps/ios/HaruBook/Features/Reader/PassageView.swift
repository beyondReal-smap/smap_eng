import SwiftUI

struct PassageView: View {
    let passage: Passage
    let showsKorean: Bool
    let isPlaying: Bool
    let isPreparing: Bool
    let isGeneratingScene: Bool
    let onTogglePlayback: () -> Void
    let onRequestScene: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                sceneSection

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

    @ViewBuilder
    private var sceneSection: some View {
        if let path = passage.sceneImagePath, !path.isEmpty {
            AuthenticatedAsyncImage(
                path: path,
                placeholder: { ScenePlaceholder(isLoading: true) },
                failure: { ScenePlaceholder(isLoading: false) }
            )
            .frame(maxWidth: .infinity)
            .frame(height: 200)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        } else {
            Button(action: onRequestScene) {
                HStack(spacing: 10) {
                    if isGeneratingScene {
                        ProgressView().tint(Color.smapPrimary)
                        Text("삽화 그리는 중…")
                    } else {
                        Image(systemName: "photo.badge.plus")
                        Text("이 장면 그리기")
                    }
                }
                .font(.smapBodyEmphasis)
                .foregroundStyle(Color.smapPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(Color.smapPrimarySoft, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .strokeBorder(Color.smapPrimary.opacity(0.4), style: StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
                )
            }
            .buttonStyle(.plain)
            .disabled(isGeneratingScene)
        }
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
