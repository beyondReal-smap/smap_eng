import SwiftUI

/// 단일 퀴즈 문항 카드. 4지선다 + 즉시 정/오답 피드백.
struct QuizQuestionCard: View {
    let quiz: Quiz
    let questionNumber: Int
    let total: Int
    let selection: Int?
    let onSelect: (Int) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                BadgeLabel(text: "Q \(questionNumber) / \(total)", tone: .primary)
                Spacer()
            }

            Text(quiz.question)
                .font(.smapHeading)
                .foregroundStyle(Color.smapText)
                .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 10) {
                ForEach(Array(quiz.choices.enumerated()), id: \.offset) { index, choice in
                    ChoiceRow(
                        index: index,
                        text: choice,
                        state: stateFor(index: index)
                    ) {
                        if selection == nil { onSelect(index) }
                    }
                }
            }

            if let selection {
                feedback(for: selection)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1)
        )
    }

    private func stateFor(index: Int) -> ChoiceRow.State {
        guard let selection else { return .neutral }
        if index == quiz.answerIndex { return .correct }
        if index == selection { return .wrong }
        return .neutral
    }

    @ViewBuilder
    private func feedback(for selection: Int) -> some View {
        let isCorrect = selection == quiz.answerIndex
        VStack(alignment: .leading, spacing: 6) {
            Text(isCorrect ? "정답이에요! 🎉" : "조금 아쉬워요.")
                .font(.smapBodyEmphasis)
                .foregroundStyle(isCorrect ? Color.smapPrimary : Color.smapDanger)
            if let explanation = quiz.explanation, !explanation.isEmpty {
                Text(explanation)
                    .font(.smapBody)
                    .foregroundStyle(Color.smapMuted)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            (isCorrect ? Color.smapPrimary : Color.smapDanger).opacity(0.08),
            in: RoundedRectangle(cornerRadius: 12)
        )
    }
}

private struct ChoiceRow: View {
    enum State { case neutral, correct, wrong }

    let index: Int
    let text: String
    let state: State
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .top, spacing: 12) {
                Text(letter(for: index))
                    .font(.smapBodyEmphasis)
                    .frame(width: 28, height: 28)
                    .background(badgeBackground, in: Circle())
                    .foregroundStyle(badgeForeground)
                Text(text)
                    .font(.smapBody)
                    .foregroundStyle(Color.smapText)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if state == .correct {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Color.smapPrimary)
                } else if state == .wrong {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(Color.smapDanger)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(rowBackground, in: RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16).stroke(rowBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func letter(for index: Int) -> String {
        let letters = ["A", "B", "C", "D"]
        return letters.indices.contains(index) ? letters[index] : "\(index + 1)"
    }

    private var badgeBackground: Color {
        switch state {
        case .neutral: return Color.smapPrimarySoft
        case .correct: return Color.smapPrimary
        case .wrong: return Color.smapDanger
        }
    }

    private var badgeForeground: Color {
        switch state {
        case .neutral: return Color.smapPrimary
        case .correct, .wrong: return .white
        }
    }

    private var rowBackground: Color {
        switch state {
        case .neutral: return Color.smapSurface
        case .correct: return Color.smapPrimary.opacity(0.08)
        case .wrong: return Color.smapDanger.opacity(0.08)
        }
    }

    private var rowBorder: Color {
        switch state {
        case .neutral: return Color.smapBorder
        case .correct: return Color.smapPrimary
        case .wrong: return Color.smapDanger
        }
    }
}
