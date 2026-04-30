import Foundation

/// 책 생성 마법사 step 3에서 부모에게 던지는 한국어 인테이크 질문.
///
/// 백엔드 `/api/books/intake/questions` 응답 항목과 1:1 대응.
struct IntakeQuestion: Codable, Identifiable, Hashable, Sendable {
    /// slug — `[a-z0-9][a-z0-9-]*` 1~40자.
    let id: String
    /// 한국어 질문 본문.
    let text: String
    /// 입력칸 placeholder(선택).
    let placeholder: String?
    /// 선택지 칩 — 클릭 시 자동 입력 (최대 4).
    let suggestionChips: [String]?
}

struct IntakeQuestionsResponse: Decodable {
    let questions: [IntakeQuestion]
    let cached: Bool
}

/// `/api/books` POST 시 보낼 인테이크 페이로드.
///
/// 답변을 건너뛴 질문은 `text: nil` 로 정규화 (백엔드는 null 허용).
struct IntakeAnswer: Encodable, Hashable, Sendable {
    let questionId: String
    let text: String?
}

struct IntakePayload: Encodable, Sendable {
    let questions: [QuestionRef]
    let answers: [IntakeAnswer]

    struct QuestionRef: Encodable, Hashable, Sendable {
        let id: String
        let text: String
    }

    init(questions: [IntakeQuestion], answers: [String: String?]) {
        self.questions = questions.map { QuestionRef(id: $0.id, text: $0.text) }
        self.answers = questions.map { question in
            let raw = answers[question.id] ?? nil
            let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines)
            return IntakeAnswer(questionId: question.id, text: (trimmed?.isEmpty ?? true) ? nil : trimmed)
        }
    }
}
