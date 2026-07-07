import Foundation

/// 책의 CEFR 난이도. 백엔드와 동일 A1~B2 4종. UI 필터/배지에 모두 노출.
enum CefrLevel: String, Codable, CaseIterable, Hashable, Sendable, Identifiable {
    case a1 = "A1"
    case a2 = "A2"
    case b1 = "B1"
    case b2 = "B2"

    var id: String { rawValue }
    var label: String { rawValue }

    static func recommended(forAge age: Int) -> [CefrLevel] {
        switch age {
        case ..<7: return [.a1]
        case 7...8: return [.a1, .a2]
        default: return [.a2, .b1]
        }
    }
}

/// 책 본문에서 학습자가 알아두면 좋은 핵심 단어. LLM이 생성 시 함께 채운다.
/// Reader에서 본문 텍스트를 토큰화해 매칭되는 단어를 클릭 가능한 popover로 감싼다.
struct VocabularyEntry: Codable, Hashable, Sendable {
    let word: String
    let meaning: String
}

/// 책 속 미션 — 리더가 특정 passage에서 노출하는 게임 요소. 웹 `schema.ts`의 `Mission` 미러.
/// wordHunt/check 둘 다 optional — LLM 변동성에 fail-soft (미션 없어도 책은 유효).
struct Mission: Codable, Hashable, Sendable {
    /// passages.orderIndex와 매칭되는 0-based 인덱스. malformed 디코딩 강등 시 -1.
    let passageIndex: Int
    let wordHunt: MissionWordHunt?
    let check: MissionCheck?

    init(passageIndex: Int, wordHunt: MissionWordHunt?, check: MissionCheck?) {
        self.passageIndex = passageIndex
        self.wordHunt = wordHunt
        self.check = check
    }

    private enum CodingKeys: String, CodingKey {
        case passageIndex, wordHunt, check
    }

    /// 관대(lossy) 디코딩 — 서버가 저장 전 검증하지만, 불완전한 미션 요소 하나가
    /// Book 전체 디코딩을 throw시켜 책이 안 열리는 실패 모드는 막는다(AOS 기본값 디코딩과 대칭).
    /// malformed 필드는 -1/nil로 강등되고 ReaderViewModel.buildMissionIndex가 폐기한다.
    init(from decoder: Decoder) throws {
        guard let c = try? decoder.container(keyedBy: CodingKeys.self) else {
            self.passageIndex = -1
            self.wordHunt = nil
            self.check = nil
            return
        }
        self.passageIndex = (try? c.decode(Int.self, forKey: .passageIndex)) ?? -1
        self.wordHunt = try? c.decodeIfPresent(MissionWordHunt.self, forKey: .wordHunt)
        self.check = try? c.decodeIfPresent(MissionCheck.self, forKey: .check)
    }
}

/// 해당 passage 본문에 실제로 나오는 vocabulary 단어를 찾아 탭하는 미션.
struct MissionWordHunt: Codable, Hashable, Sendable {
    /// 해당 passage의 en 본문에 그대로 등장하는 단어.
    let targetWord: String
    /// 아이에게 보여줄 한국어 힌트 (예: "'용감한'이라는 뜻의 단어를 찾아봐!").
    let hintKo: String
}

/// 해당 passage 내용으로 답할 수 있는 2지선다 확인 질문.
struct MissionCheck: Codable, Hashable, Sendable {
    let question: String
    let choices: [String]
    /// 정답 choice 인덱스 (0|1).
    let answerIndex: Int
}

struct Book: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let profileId: Int
    let title: String
    let age: Int
    let cefr: CefrLevel
    let topic: String?
    let coverImagePath: String?
    /// nil/빈 배열이면 Reader는 모든 단어를 plain text로 렌더링.
    let vocabulary: [VocabularyEntry]?
    /// 책 속 미션. nil/빈 배열이면 레거시 책 — 미션 UI 없이 기존과 동일하게 렌더(fail-soft).
    let missions: [Mission]?
    let flaggedAt: Date?
    let createdAt: Date?

    var isFlagged: Bool { flaggedAt != nil }
}

/// `GET /api/books?profileId=…` 응답. `stats`는 책별 진도 스냅샷(향후 사용 예정).
struct BooksResponse: Decodable {
    let books: [Book]
}

/// `GET /api/books/[id]` 응답.
struct BookDetail: Decodable {
    let book: Book
    let passages: [Passage]
}
