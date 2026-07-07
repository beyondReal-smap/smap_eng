import Foundation
import Observation
import CoreGraphics

/// 본문 텍스트 크기. 사용자 전역 선호도로 UserDefaults에 영속화.
enum ReaderTextScale: String, CaseIterable, Identifiable {
    case small, medium, large, xlarge

    var id: String { rawValue }

    /// 본문 폰트 사이즈(`atozRegular`). medium = 28pt를 기본값으로 — 어린이 학습 상황에서
    /// 22pt는 너무 작다는 피드백을 반영. 더 작게/더 크게 양방향 옵션 유지.
    var fontSize: CGFloat {
        switch self {
        case .small:  return 22
        case .medium: return 28
        case .large:  return 34
        case .xlarge: return 40
        }
    }

    var label: String {
        switch self {
        case .small:  return "작게"
        case .medium: return "보통"
        case .large:  return "크게"
        case .xlarge: return "아주 크게"
        }
    }

    /// 텍스트 크기 컨트롤의 "A" 미리보기 글자 크기 — 단계 차이를 시각적으로 보여주기 위한 값.
    /// 실제 본문 폰트(`fontSize`)와는 별개.
    var controlPreviewSize: CGFloat {
        switch self {
        case .small:  return 12
        case .medium: return 15
        case .large:  return 18
        case .xlarge: return 22
        }
    }

    private static let defaultsKey = "readerTextScale"

    static func load() -> ReaderTextScale {
        let raw = UserDefaults.standard.string(forKey: defaultsKey) ?? ""
        return ReaderTextScale(rawValue: raw) ?? .medium
    }

    func save() {
        UserDefaults.standard.set(rawValue, forKey: Self.defaultsKey)
    }
}

@Observable
@MainActor
final class ReaderViewModel {
    let book: Book
    let profileId: Int

    var passages: [Passage] = []
    var currentIndex: Int = 0
    var showsKorean: Bool = false
    var isLoadingDetail: Bool = true
    var error: String?
    /// 본문 텍스트 크기. 변경 시 UserDefaults에 영속화 — 모든 책에서 같은 크기로 시작.
    var textScale: ReaderTextScale = ReaderTextScale.load() {
        didSet { textScale.save() }
    }

    /// 현재 진행 중인 reading_log id. 외부(QuizView)가 점수 PATCH 시 참조한다.
    private(set) var readingLogId: Int?

    /// 책 속 미션 — passageIndex → Mission. 서버가 저장 시 검증하지만(fail-soft) 레거시/수동
    /// 편집 대비 워드 헌트는 vocabulary에 있는 단어일 때만 유효로 간주한다(웹 reader의
    /// missionByIdx와 동일). 레거시 책(missions nil)은 빈 맵 — 미션 UI 없이 렌더.
    let missionsByIndex: [Int: Mission]

    /// 완료한 미션의 passageIndex 집합 — UserDefaults 복원(웹 localStorage `reader:mission:{bookId}` 패리티).
    private(set) var missionsDone: Set<Int>

    /// 마지막으로 TTS 합성이 진행 중인 passage id. UI 인디케이터용.
    private(set) var synthesizingPassageId: Int?

    /// 장면 이미지 생성이 진행 중인 passage id. UI 인디케이터용.
    private(set) var generatingScenePassageId: Int?

    private var hasReportedFinish: Bool = false

    init(book: Book, profileId: Int) {
        self.book = book
        self.profileId = profileId
        self.missionsByIndex = Self.buildMissionIndex(book: book)
        self.missionsDone = Self.loadMissionsDone(bookId: book.id)
    }

    func bootstrap() async {
        async let detail: Void = loadDetail()
        async let log: Void = startLog()
        _ = await (detail, log)
    }

    /// 페이지 전환 — 반드시 동기로 상태를 갱신한다.
    ///
    /// TabView(selection:)의 setter가 비동기(Task)로만 상태를 바꾸면 SwiftUI가 바인딩
    /// 값 불일치를 감지해 페이지가 되돌아가거나(스냅백) 스와이프가 씹히는 오작동이 난다.
    /// 진행률 서버 PATCH만 비동기로 분리.
    func pageChanged(to newIndex: Int) {
        // 페이지 전환 시 한글 해석은 자동으로 닫는다 — 다음 문장은 영문부터 다시 만나도록 학습 흐름 유지.
        // 사용자가 다시 필요하면 한글 토글 버튼으로 켤 수 있다.
        if newIndex != currentIndex {
            showsKorean = false
        }
        currentIndex = newIndex
        // 떠나는 페이지의 오디오 정지 — 문장이 3~6문장으로 길어져(오디오 30초+) 이전
        // 낭독이 다음 페이지까지 이어지면 "정지가 안 된다"는 혼란을 만든다.
        if let playingId = AudioPlayer.shared.nowPlayingPassageId,
           passages.indices.contains(newIndex),
           passages[newIndex].id != playingId {
            AudioPlayer.shared.stop()
        }
        guard !passages.isEmpty else { return }
        let total = max(passages.count, 1)
        let ratio = Double(newIndex + 1) / Double(total)
        Task { await patchLog(progressRatio: ratio, finishedAtUnix: nil) }
    }

    func leave() async {
        guard !hasReportedFinish else { return }
        hasReportedFinish = true
        let now = Int(Date().timeIntervalSince1970)
        await patchLog(progressRatio: nil, finishedAtUnix: now)
        AudioPlayer.shared.stop()
    }

    func toggleKorean() {
        showsKorean.toggle()
    }

    // MARK: - 책 속 미션

    func mission(for passageIndex: Int) -> Mission? {
        missionsByIndex[passageIndex]
    }

    /// 워드 헌트 판정 — 해당 passage에 미완료 워드 헌트가 있고 탭한 단어가 targetWord와
    /// 일치하면 완료. 그 외의 단어 탭은 기존 뜻 보기 동작 그대로(여기서는 아무것도 안 함).
    /// 정규화(trim+lowercase+구두점 제거)는 SRS와 같은 규칙 — srsNormalizeKey 재사용.
    func handleWordTap(_ word: String, passageIndex: Int) {
        guard let hunt = missionsByIndex[passageIndex]?.wordHunt,
              !missionsDone.contains(passageIndex) else { return }
        if srsNormalizeKey(word) == srsNormalizeKey(hunt.targetWord) {
            completeMission(at: passageIndex)
        }
    }

    /// 미션 완료 — 로컬 영속화(정수 배열). 진행을 막지 않는 재미 요소라 서버 기록 없음(웹과 동일).
    func completeMission(at passageIndex: Int) {
        guard !missionsDone.contains(passageIndex) else { return }
        missionsDone.insert(passageIndex)
        UserDefaults.standard.set(
            Array(missionsDone).sorted(),
            forKey: Self.missionDefaultsKey(bookId: book.id),
        )
    }

    private static func missionDefaultsKey(bookId: Int) -> String {
        "reader:mission:\(bookId)"
    }

    private static func buildMissionIndex(book: Book) -> [Int: Mission] {
        guard let missions = book.missions, !missions.isEmpty else { return [:] }
        let vocabKeys = Set((book.vocabulary ?? []).map { srsNormalizeKey($0.word) })
        var map: [Int: Mission] = [:]
        for m in missions {
            // lossy 디코딩 강등(-1) 포함, 음수 인덱스는 폐기. 상한 초과는 조회에 안 걸려 자연 무시.
            guard m.passageIndex >= 0 else { continue }
            // 워드 헌트는 탭 대상이 밑줄(vocabulary) 단어뿐이므로 vocabulary에 없으면 무시.
            var hunt: MissionWordHunt?
            if let wordHunt = m.wordHunt, vocabKeys.contains(srsNormalizeKey(wordHunt.targetWord)) {
                hunt = wordHunt
            }
            // check는 질문/선택지/정답 인덱스가 온전할 때만 유효 — 불완전 미션이
            // 버튼 없는 빈 카드로 뜨지 않게(AOS buildMissionMap과 대칭).
            var check: MissionCheck?
            if let candidate = m.check,
               !candidate.question.isEmpty,
               candidate.choices.count >= 2,
               candidate.choices.indices.contains(candidate.answerIndex) {
                check = candidate
            }
            // wordHunt/check 둘 다 비면 미션 자체를 버린다.
            guard hunt != nil || check != nil else { continue }
            map[m.passageIndex] = Mission(passageIndex: m.passageIndex, wordHunt: hunt, check: check)
        }
        return map
    }

    private static func loadMissionsDone(bookId: Int) -> Set<Int> {
        let raw = UserDefaults.standard.array(forKey: missionDefaultsKey(bookId: bookId)) ?? []
        return Set(raw.compactMap { $0 as? Int })
    }

    /// 재생 토글. audioPath가 없으면 TTS 합성을 먼저 요청한다.
    func togglePlayback(for passageIndex: Int) async {
        guard passages.indices.contains(passageIndex) else { return }
        let passage = passages[passageIndex]

        if let path = passage.audioPath, !path.isEmpty {
            AudioPlayer.shared.toggle(passageId: passage.id, audioPath: path)
            return
        }

        synthesizingPassageId = passage.id
        defer { synthesizingPassageId = nil }
        do {
            // passage가 3~6문장(최대 ~95단어)으로 길어져 합성이 기본 60s에
            // 근접할 수 있어 90s로 상향. Android ReaderViewModel과 패리티.
            let response: TtsResponse = try await APIClient.shared.send(
                Endpoint(path: "/api/tts/\(passage.id)", method: .post, requiresAuth: true, timeout: 90)
            )
            if let idx = passages.firstIndex(where: { $0.id == passage.id }) {
                passages[idx] = Passage(
                    id: passage.id,
                    bookId: passage.bookId,
                    orderIndex: passage.orderIndex,
                    textEn: passage.textEn,
                    textKo: passage.textKo,
                    audioPath: response.audioPath,
                    sceneImagePath: passage.sceneImagePath
                )
            }
            AudioPlayer.shared.toggle(passageId: passage.id, audioPath: response.audioPath)
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// 장면 이미지를 합성한다(`POST /api/image/passage/[id]`). 멱등.
    func requestSceneImage(for passageIndex: Int) async {
        guard passages.indices.contains(passageIndex) else { return }
        let passage = passages[passageIndex]
        if passage.sceneImagePath?.isEmpty == false { return }

        generatingScenePassageId = passage.id
        defer { generatingScenePassageId = nil }
        do {
            let response: SceneImageResponse = try await APIClient.shared.send(
                Endpoint(path: "/api/image/passage/\(passage.id)", method: .post)
            )
            if let idx = passages.firstIndex(where: { $0.id == passage.id }) {
                passages[idx] = Passage(
                    id: passage.id,
                    bookId: passage.bookId,
                    orderIndex: passage.orderIndex,
                    textEn: passage.textEn,
                    textKo: passage.textKo,
                    audioPath: passage.audioPath,
                    sceneImagePath: response.sceneImagePath
                )
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Private

    private func loadDetail() async {
        do {
            let detail: BookDetail = try await APIClient.shared.send(
                Endpoint(path: "/api/books/\(book.id)")
            )
            self.passages = detail.passages.sorted(by: { $0.orderIndex < $1.orderIndex })
            self.isLoadingDetail = false
        } catch {
            self.error = error.localizedDescription
            self.isLoadingDetail = false
        }
    }

    private func startLog() async {
        do {
            let response: ReadingLogResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/logs",
                    method: .post,
                    body: StartLogRequest(profileId: profileId, bookId: book.id)
                )
            )
            self.readingLogId = response.log.id
        } catch {
            // 소프트 페일
        }
    }

    private func patchLog(progressRatio: Double?, finishedAtUnix: Int?) async {
        guard let logId = readingLogId else { return }
        do {
            let _: ReadingLogResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/logs",
                    method: .patch,
                    body: PatchLogRequest(
                        id: logId,
                        progressRatio: progressRatio,
                        finishedAtUnix: finishedAtUnix,
                        quizScore: nil
                    )
                )
            )
        } catch {
            // 소프트 페일
        }
    }
}

private struct StartLogRequest: Encodable {
    let profileId: Int
    let bookId: Int
}

private struct PatchLogRequest: Encodable {
    let id: Int
    let progressRatio: Double?
    let finishedAtUnix: Int?
    let quizScore: Int?
}

private struct TtsResponse: Decodable {
    let passageId: Int
    let audioPath: String
    let cached: Bool?
    let bytes: Int?
}

private struct SceneImageResponse: Decodable {
    let passageId: Int?
    let sceneImagePath: String
}
