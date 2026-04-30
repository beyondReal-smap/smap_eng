import Foundation
import Observation

/// 책 생성 마법사의 모든 상태/흐름을 한 곳에 모은 ViewModel.
///
/// 백엔드 호출:
/// - `POST /api/books/intake/questions` → 2~3개 질문
/// - `POST /api/books { intake }` → 책 + passages
/// - 책 생성 직후 백그라운드 `POST /api/image/book/[id]/cover` (멱등, 실패 무시)
@Observable
@MainActor
final class CreateBookViewModel {
    enum Genre: String, CaseIterable, Identifiable, Sendable {
        case fiction
        case nonFiction = "non_fiction"

        var id: String { rawValue }
        var label: String {
            switch self {
            case .fiction: return "이야기 (Fiction)"
            case .nonFiction: return "정보 (Non-fiction)"
            }
        }
        var description: String {
            switch self {
            case .fiction: return "상상 속 인물과 모험"
            case .nonFiction: return "실제 사실과 지식"
            }
        }
    }

    enum Step: Int, Hashable, Sendable {
        case genre = 0
        case level
        case intake
        case generating
    }

    let profileId: Int

    var step: Step = .genre
    var genre: Genre? = nil
    var cefr: CefrLevel? = nil

    var intakeQuestions: [IntakeQuestion] = []
    var intakeAnswers: [String: String] = [:]   // questionId → 사용자 입력
    var isLoadingIntake: Bool = false
    var intakeError: String? = nil

    var isGenerating: Bool = false
    var generationError: String? = nil
    var createdBook: Book? = nil

    init(profileId: Int) {
        self.profileId = profileId
    }

    // MARK: - Step transitions

    func selectGenre(_ value: Genre) {
        genre = value
        step = .level
    }

    func selectLevel(_ value: CefrLevel) {
        cefr = value
        step = .intake
        Task { await loadIntake() }
    }

    func goBack() {
        switch step {
        case .genre: break
        case .level: step = .genre
        case .intake: step = .level
        case .generating: break // 생성 중에는 뒤로가기 불가
        }
    }

    // MARK: - Intake

    func loadIntake() async {
        guard let genre, let cefr else { return }
        isLoadingIntake = true
        intakeError = nil
        defer { isLoadingIntake = false }

        do {
            let response: IntakeQuestionsResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/books/intake/questions",
                    method: .post,
                    body: IntakeRequest(profileId: profileId, genre: genre.rawValue, cefr: cefr.rawValue)
                )
            )
            intakeQuestions = response.questions
        } catch {
            intakeError = "질문을 불러오지 못했어요: \(error.localizedDescription)"
        }
    }

    func updateAnswer(_ id: String, text: String) {
        intakeAnswers[id] = text
    }

    func selectChip(_ id: String, value: String) {
        intakeAnswers[id] = value
    }

    // MARK: - Generation

    func generate() async {
        guard let genre, let cefr, !intakeQuestions.isEmpty else { return }
        guard !isGenerating else { return }

        step = .generating
        isGenerating = true
        generationError = nil
        defer { isGenerating = false }

        let intake = IntakePayload(questions: intakeQuestions, answers: intakeAnswers.mapValues { Optional($0) })

        do {
            let response: CreateBookResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/books",
                    method: .post,
                    body: CreateBookRequest(
                        profileId: profileId,
                        level: LevelPayload(age: ageFromProfile(), cefr: cefr.rawValue),
                        genre: genre.rawValue,
                        intake: intake
                    )
                )
            )
            createdBook = response.book
            // 표지는 백그라운드 — 완료 여부와 무관하게 마법사는 책장으로 복귀.
            Task.detached { [bookId = response.book.id] in
                _ = try? await APIClient.shared.send(
                    Endpoint<EmptyResponse>(
                        path: "/api/image/book/\(bookId)/cover",
                        method: .post,
                        requiresAuth: true
                    )
                )
            }
        } catch {
            generationError = "동화 생성에 실패했어요: \(error.localizedDescription)"
        }
    }

    // MARK: - Helpers

    /// 프로필 나이는 백엔드가 profileId로부터 직접 조회하므로, level.age는 클라이언트에서
    /// 보내도 백엔드가 신뢰하지 않는다. Phase 1+ 흐름을 유지하되 실제로 필수 필드라 임의 값(7)을 보낸다.
    /// 추후 `GET /api/profiles/[id]` 를 통해 정확한 age를 동기화하는 게 깔끔.
    private func ageFromProfile() -> Int { 7 }
}

// MARK: - Wire types

private struct IntakeRequest: Encodable {
    let profileId: Int
    let genre: String
    let cefr: String
}

private struct LevelPayload: Encodable {
    let age: Int
    let cefr: String
}

private struct CreateBookRequest: Encodable {
    let profileId: Int
    let level: LevelPayload
    let genre: String
    let intake: IntakePayload
}

private struct CreateBookResponse: Decodable {
    let book: Book
}
