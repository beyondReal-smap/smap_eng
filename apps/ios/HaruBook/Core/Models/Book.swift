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

/// 결말 분기 한 페이지. 웹 `schema.ts` `EndingPassage` 미러. UI는 이번 범위 밖 — 디코딩만 보존.
struct EndingPassage: Codable, Hashable, Sendable {
    let en: String
    let ko: String
}

/// 픽션 결말 분기 A/B. 웹 `schema.ts` `AlternateEnding` 미러.
/// 페이지 수 가변 처리·선택 다이얼로그는 다음 단계 — 모델만 유지한다.
struct AlternateEnding: Codable, Hashable, Sendable {
    let labelA: String
    let labelB: String
    let passagesA: [EndingPassage]
    let passagesB: [EndingPassage]
}

/// 논픽션 재미사실. 웹 `schema.ts` `FunFact` 미러. title=영문 헤드라인, body=한국어 한 문장.
struct FunFact: Codable, Hashable, Sendable {
    let title: String
    let body: String

    init(title: String, body: String) {
        self.title = title
        self.body = body
    }

    private enum CodingKeys: String, CodingKey {
        case title, body
    }

    /// 필드 누락이 Book 전체 디코딩을 깨지 않게 빈 문자열로 강등. Reader가 빈 항목을 걸러낸다.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        title = (try? c.decode(String.self, forKey: .title)) ?? ""
        body = (try? c.decode(String.self, forKey: .body)) ?? ""
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(title, forKey: .title)
        try c.encode(body, forKey: .body)
    }
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
    /// `"fiction"` / `"non_fiction"`. nil=레거시 행이며 fiction으로 해석(웹 schema 주석과 동일).
    let genre: String?
    /// 결말 분기. 이번 범위는 디코딩·데이터 보존만. UI/페이지 가변은 다음 단계.
    let alternateEnding: AlternateEnding?
    /// 결말 A TTS 경로 배열. 합성 전·레거시는 nil.
    let endingAudioPathsA: [String]?
    /// 결말 B TTS 경로 배열. 합성 전·레거시는 nil.
    let endingAudioPathsB: [String]?
    /// 논픽션 재미사실. 픽션/레거시는 nil.
    let funFacts: [FunFact]?
    let flaggedAt: Date?
    let createdAt: Date?

    var isFlagged: Bool { flaggedAt != nil }

    /// 레거시(nil)와 명시 fiction은 픽션. funFacts 노출은 논픽션만.
    var isNonFiction: Bool { genre == "non_fiction" }

    /// 논픽션 + 비어 있지 않은 funFacts만 반환. 그 외는 nil — Reader가 섹션을 숨긴다.
    var displayFunFacts: [FunFact]? {
        guard isNonFiction else { return nil }
        let cleaned = (funFacts ?? []).filter { !$0.title.isEmpty || !$0.body.isEmpty }
        return cleaned.isEmpty ? nil : cleaned
    }

    private enum CodingKeys: String, CodingKey {
        case id, profileId, title, age, cefr, topic, coverImagePath
        case vocabulary, missions, genre
        case alternateEnding, endingAudioPathsA, endingAudioPathsB, funFacts
        case flaggedAt, createdAt
    }

    /// 레거시 책은 신규 JSON 필드가 없거나 null. 필드 하나가 깨져도 책 목록/상세 전체가
    /// 실패하지 않도록 확장 필드는 `try?` + 문자열 JSON 폴백으로 fail-soft 한다.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(Int.self, forKey: .id)
        profileId = try c.decode(Int.self, forKey: .profileId)
        title = try c.decode(String.self, forKey: .title)
        age = try c.decode(Int.self, forKey: .age)
        cefr = try c.decode(CefrLevel.self, forKey: .cefr)
        topic = try? c.decodeIfPresent(String.self, forKey: .topic)
        coverImagePath = try? c.decodeIfPresent(String.self, forKey: .coverImagePath)
        vocabulary = try? c.decodeIfPresent([VocabularyEntry].self, forKey: .vocabulary)
        missions = try? c.decodeIfPresent([Mission].self, forKey: .missions)
        genre = try? c.decodeIfPresent(String.self, forKey: .genre)
        alternateEnding = Self.decodeFlexible(c, key: .alternateEnding)
        endingAudioPathsA = Self.decodeFlexible(c, key: .endingAudioPathsA)
        endingAudioPathsB = Self.decodeFlexible(c, key: .endingAudioPathsB)
        funFacts = Self.decodeFlexible(c, key: .funFacts)
        flaggedAt = try? c.decodeIfPresent(Date.self, forKey: .flaggedAt)
        createdAt = try? c.decodeIfPresent(Date.self, forKey: .createdAt)
    }

    /// 객체/배열로 오면 그대로, 레거시 typeCast 사고처럼 JSON 문자열로 오면 한 번 더 파싱.
    /// 둘 다 실패하면 nil — 해당 필드만 버리고 책은 연다.
    private static func decodeFlexible<T: Decodable>(
        _ c: KeyedDecodingContainer<CodingKeys>,
        key: CodingKeys,
    ) -> T? {
        if let value = try? c.decodeIfPresent(T.self, forKey: key) {
            return value
        }
        if let raw = try? c.decodeIfPresent(String.self, forKey: key),
           let data = raw.data(using: .utf8) {
            return try? JSONDecoder().decode(T.self, from: data)
        }
        return nil
    }

    /// 커스텀 `init(from:)` 를 쓰면 encode 합성이 빠질 수 있어 명시. 요청 바디로 Book을
    /// 보내는 경로는 없지만 Codable 정합성을 유지한다.
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(profileId, forKey: .profileId)
        try c.encode(title, forKey: .title)
        try c.encode(age, forKey: .age)
        try c.encode(cefr, forKey: .cefr)
        try c.encodeIfPresent(topic, forKey: .topic)
        try c.encodeIfPresent(coverImagePath, forKey: .coverImagePath)
        try c.encodeIfPresent(vocabulary, forKey: .vocabulary)
        try c.encodeIfPresent(missions, forKey: .missions)
        try c.encodeIfPresent(genre, forKey: .genre)
        try c.encodeIfPresent(alternateEnding, forKey: .alternateEnding)
        try c.encodeIfPresent(endingAudioPathsA, forKey: .endingAudioPathsA)
        try c.encodeIfPresent(endingAudioPathsB, forKey: .endingAudioPathsB)
        try c.encodeIfPresent(funFacts, forKey: .funFacts)
        try c.encodeIfPresent(flaggedAt, forKey: .flaggedAt)
        try c.encodeIfPresent(createdAt, forKey: .createdAt)
    }
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
