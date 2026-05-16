import SwiftUI

struct QuizView: View {
    @State private var viewModel: QuizViewModel
    let onClose: () -> Void

    init(book: Book, readingLogId: Int?, onClose: @escaping () -> Void) {
        _viewModel = State(initialValue: QuizViewModel(book: book, readingLogId: readingLogId))
        self.onClose = onClose
    }

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            switch viewModel.phase {
            case .loading:
                VStack(spacing: 16) {
                    ProgressView().tint(Color.smapPrimary)
                    Text("퀴즈를 준비하고 있어요…")
                        .font(.smapBody)
                        .foregroundStyle(Color.smapMuted)
                }
            case .error(let message):
                VStack(spacing: 16) {
                    Text(message)
                        .font(.smapBody)
                        .foregroundStyle(Color.smapDanger)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                    PrimaryButton(title: "다시 시도", variant: .tonal) {
                        Task { await viewModel.load() }
                    }
                    .padding(.horizontal, 24)
                }
            case .answering:
                answering
            case .finished:
                QuizResultView(
                    bookTitle: viewModel.book.title,
                    score: viewModel.score,
                    total: viewModel.totalQuestions,
                    onRetry: { viewModel.restart() },
                    onClose: onClose
                )
            }
        }
        .navigationTitle("퀴즈")
        .navigationBarTitleDisplayMode(.inline)
        .task { if viewModel.quizzes.isEmpty { await viewModel.load() } }
    }

    @ViewBuilder
    private var answering: some View {
        VStack(spacing: 16) {
            ProgressView(value: Double(viewModel.currentIndex + 1), total: Double(max(viewModel.totalQuestions, 1)))
                .tint(Color.smapPrimary)
                .padding(.horizontal, 24)
                .padding(.top, 12)

            ScrollView {
                if let quiz = viewModel.currentQuiz {
                    QuizQuestionCard(
                        quiz: quiz,
                        questionNumber: viewModel.currentIndex + 1,
                        total: viewModel.totalQuestions,
                        selection: viewModel.selections[quiz.id],
                        onSelect: { idx in
                            // 선택 즉시 정/오답 햅틱. quiz.answerIndex와 비교 — 처음 선택만(이미 같은 답이면 무음).
                            if viewModel.selections[quiz.id] != idx {
                                Haptic.play(idx == quiz.answerIndex ? .success : .error)
                            }
                            viewModel.selectAnswer(idx)
                        },
                    )
                    .padding(.horizontal, 20)
                    .padding(.vertical, 8)
                    .id(quiz.id)
                }
            }

            Spacer(minLength: 0)

            footer
        }
    }

    @ViewBuilder
    private var footer: some View {
        let answered = viewModel.currentQuiz.flatMap { viewModel.selections[$0.id] } != nil

        HStack(spacing: 12) {
            if viewModel.isLastQuestion {
                PrimaryButton(
                    title: viewModel.isSubmitting ? "제출 중…" : "결과 보기",
                    variant: .filled,
                    isLoading: viewModel.isSubmitting,
                    isEnabled: answered && !viewModel.isSubmitting
                ) {
                    Task { await viewModel.submit() }
                }
            } else {
                PrimaryButton(
                    title: "다음 문제",
                    variant: .filled,
                    isEnabled: answered
                ) {
                    viewModel.goToNext()
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(.ultraThinMaterial)
    }
}
