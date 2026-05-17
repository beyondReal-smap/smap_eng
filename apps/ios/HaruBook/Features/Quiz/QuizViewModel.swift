import Foundation
import Observation

@Observable
@MainActor
final class QuizViewModel {
    enum Phase: Equatable {
        case loading
        case answering
        case finished
        case error(String)
    }

    let book: Book
    /// Reader에서 시작된 reading_log id. 점수 PATCH 대상. nil 이면 기록 생략.
    let readingLogId: Int?

    private(set) var quizzes: [Quiz] = []
    /// `quiz.id → 사용자가 선택한 choice index`.
    private(set) var selections: [Int: Int] = [:]
    private(set) var currentIndex: Int = 0
    private(set) var phase: Phase = .loading
    private(set) var isSubmitting: Bool = false

    init(book: Book, readingLogId: Int?) {
        self.book = book
        self.readingLogId = readingLogId
    }

    var currentQuiz: Quiz? { quizzes.indices.contains(currentIndex) ? quizzes[currentIndex] : nil }
    var totalQuestions: Int { quizzes.count }
    var isLastQuestion: Bool { currentIndex + 1 >= quizzes.count }
    var score: Int {
        quizzes.reduce(0) { acc, quiz in
            acc + (selections[quiz.id] == quiz.answerIndex ? 1 : 0)
        }
    }

    func load() async {
        phase = .loading
        do {
            let response: QuizzesResponse = try await APIClient.shared.send(
                Endpoint(path: "/api/books/\(book.id)/quiz", method: .post)
            )
            // `orderIndex` 오름차순으로 정렬.
            quizzes = response.quizzes.sorted(by: { $0.orderIndex < $1.orderIndex })
            phase = quizzes.isEmpty ? .error("퀴즈가 아직 준비되지 않았어요.") : .answering
        } catch {
            // QuizView가 자체 헤더 없이 메시지만 노출하므로 친화 문구 그대로.
            phase = .error(error.localizedDescription)
        }
    }

    func selectAnswer(_ index: Int) {
        guard let quiz = currentQuiz else { return }
        selections[quiz.id] = index
    }

    func goToNext() {
        guard currentIndex + 1 < quizzes.count else { return }
        currentIndex += 1
    }

    func goToPrevious() {
        guard currentIndex > 0 else { return }
        currentIndex -= 1
    }

    func submit() async {
        guard !isSubmitting, !quizzes.isEmpty else { return }
        isSubmitting = true
        defer { isSubmitting = false }

        // 점수 PATCH (logId가 있을 때만)
        if let logId = readingLogId {
            do {
                let _: ReadingLogResponse = try await APIClient.shared.send(
                    Endpoint(
                        path: "/api/logs",
                        method: .patch,
                        body: PatchLogRequest(
                            id: logId,
                            progressRatio: nil,
                            finishedAtUnix: Int(Date().timeIntervalSince1970),
                            quizScore: score
                        )
                    )
                )
            } catch {
                // 점수 저장 실패해도 결과 화면은 보여준다 (소프트 페일).
            }
        }

        phase = .finished
    }

    func restart() {
        selections.removeAll()
        currentIndex = 0
        phase = .answering
    }
}

/// `/api/logs` PATCH 본문 — Reader와 별도로 정의해 의존성을 끊는다.
private struct PatchLogRequest: Encodable {
    let id: Int
    let progressRatio: Double?
    let finishedAtUnix: Int?
    let quizScore: Int?
}
