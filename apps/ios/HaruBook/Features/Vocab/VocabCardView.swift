import SwiftUI

/// 단어장 플래시카드. 탭하면 영어 ↔ 한글 뜻 사이를 뒤집는다.
/// 회전 애니메이션은 `rotation3DEffect` Y축 180°.
struct VocabCardView: View {
    let entry: VocabEntry
    let isFlipped: Bool
    let isSpeaking: Bool
    let onSpeak: () -> Void
    let onFlip: () -> Void

    var body: some View {
        ZStack {
            front.opacity(isFlipped ? 0 : 1)
            back.opacity(isFlipped ? 1 : 0)
                .rotation3DEffect(.degrees(180), axis: (x: 0, y: 1, z: 0))
        }
        .rotation3DEffect(
            .degrees(isFlipped ? 180 : 0),
            axis: (x: 0, y: 1, z: 0),
            perspective: 0.6,
        )
        .animation(.easeInOut(duration: 0.4), value: isFlipped)
        .frame(maxWidth: .infinity, minHeight: 240)
        .padding(28)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1),
        )
        .onTapGesture { onFlip() }
    }

    private var front: some View {
        VStack(spacing: 18) {
            Text(entry.word)
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundStyle(Color.smapText)
                .multilineTextAlignment(.center)

            Button {
                onSpeak()
            } label: {
                Label("발음 듣기", systemImage: isSpeaking ? "waveform" : "speaker.wave.2.fill")
                    .font(.smapCaption)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.smapPrimarySoft)
                    .foregroundStyle(Color.smapPrimary)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
            .disabled(isSpeaking)

            Text("탭해서 뜻 보기")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
        }
    }

    private var back: some View {
        VStack(spacing: 12) {
            Text(entry.word)
                .font(.smapBodyEmphasis)
                .foregroundStyle(Color.smapMuted)
            Text(entry.meaning)
                .font(.system(size: 22, weight: .semibold, design: .rounded))
                .foregroundStyle(Color.smapText)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
            Text(entry.bookTitle)
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
                .padding(.top, 4)
        }
    }
}
