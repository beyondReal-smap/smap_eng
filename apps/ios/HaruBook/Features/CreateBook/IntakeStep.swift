import SwiftUI

struct IntakeStep: View {
    @Bindable var viewModel: CreateBookViewModel
    let onSubmit: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("아이가 좋아하는 걸 알려주세요")
                            .font(.smapTitle)
                            .foregroundStyle(Color.smapText)
                        Text("선택지를 눌러도 되고, 직접 적어도 좋아요. 건너뛰어도 괜찮아요.")
                            .font(.smapBody)
                            .foregroundStyle(Color.smapMuted)
                    }

                    if viewModel.isLoadingIntake && viewModel.intakeQuestions.isEmpty {
                        HStack {
                            Spacer()
                            ProgressView().tint(Color.smapPrimary)
                            Spacer()
                        }
                        .padding(.top, 32)
                    } else if let error = viewModel.intakeError, viewModel.intakeQuestions.isEmpty {
                        VStack(spacing: 12) {
                            Text(error)
                                .font(.smapBody)
                                .foregroundStyle(Color.smapDanger)
                                .multilineTextAlignment(.center)
                            PrimaryButton(title: "다시 시도", variant: .tonal) {
                                Task { await viewModel.loadIntake() }
                            }
                        }
                        .padding(.top, 24)
                    } else {
                        ForEach(viewModel.intakeQuestions) { question in
                            QuestionCard(
                                question: question,
                                value: Binding(
                                    get: { viewModel.intakeAnswers[question.id] ?? "" },
                                    set: { viewModel.updateAnswer(question.id, text: $0) }
                                ),
                                onChip: { viewModel.selectChip(question.id, value: $0) }
                            )
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 24)
            }

            footer
        }
    }

    @ViewBuilder
    private var footer: some View {
        HStack {
            Button("건너뛰기") { onSubmit() }
                .font(.smapBodyEmphasis)
                .foregroundStyle(Color.smapMuted)
            Spacer()
            PrimaryButton(
                title: "만들기 (별 1개)",
                variant: .filled,
                isEnabled: !viewModel.intakeQuestions.isEmpty
            ) {
                onSubmit()
            }
            .frame(maxWidth: 220)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(.ultraThinMaterial)
    }
}

private struct QuestionCard: View {
    let question: IntakeQuestion
    @Binding var value: String
    let onChip: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(question.text)
                .font(.smapBodyEmphasis)
                .foregroundStyle(Color.smapText)

            TextField(question.placeholder ?? "여기에 적어주세요", text: $value, axis: .vertical)
                .font(.smapBody)
                .lineLimit(2...4)
                .padding(14)
                .background(Color.smapPrimarySoft, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

            if let chips = question.suggestionChips, !chips.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(chips, id: \.self) { chip in
                            Button { onChip(chip) } label: {
                                Text(chip)
                                    .font(.smapBadge)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(
                                        value == chip ? Color.smapPrimary : Color.smapSurface,
                                        in: Capsule()
                                    )
                                    .overlay(Capsule().stroke(Color.smapBorder, lineWidth: value == chip ? 0 : 1))
                                    .foregroundStyle(value == chip ? .white : Color.smapText)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.smapSurface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Color.smapBorder, lineWidth: 1)
        )
    }
}
