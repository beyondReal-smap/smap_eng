import SwiftUI

/// 단어장 플래시카드. 탭하면 영어 ↔ 한글 뜻 사이를 뒤집는다.
/// 회전 애니메이션은 `rotation3DEffect` Y축 180°. 카드 좌상단에 학습 상태 칩을 배치해
/// 학습자가 새 단어 / 다시 학습 / 학습 중인지 즉시 알아볼 수 있도록 한다.
struct VocabCardView: View {
    let entry: VocabEntry
    let cardState: VocabCardState
    let level: Int
    let isFlipped: Bool
    let isSpeaking: Bool
    let onSpeak: () -> Void
    let onFlip: () -> Void

    var body: some View {
        ZStack(alignment: .topLeading) {
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

            stateChip
                .padding(.top, 14)
                .padding(.leading, 14)
        }
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

    /// 카드 좌상단 학습 상태 칩 — 새/다시 학습/학습 중을 색으로 즉시 구분. 마스터는 deck에서 빠지므로 표시 없음.
    @ViewBuilder
    private var stateChip: some View {
        switch cardState {
        case .new:
            chip(label: "NEW", icon: "sparkles", fg: Color(hex: 0x1E6FB8), bg: Color(hex: 0xE2F0FB))
        case .relearning:
            chip(label: "다시 학습", icon: "arrow.counterclockwise", fg: Color.smapDanger, bg: Color(hex: 0xFDE2DD))
        case .learning:
            chip(label: "Lv.\(level)", icon: "graduationcap.fill", fg: Color(hex: 0x8A6300), bg: Color(hex: 0xFCEDC1))
        case .mastered:
            EmptyView()
        }
    }

    private func chip(label: String, icon: String, fg: Color, bg: Color) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .bold))
            Text(label)
                .font(Font.atozBold(11))
        }
        .foregroundStyle(fg)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(bg, in: Capsule())
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
