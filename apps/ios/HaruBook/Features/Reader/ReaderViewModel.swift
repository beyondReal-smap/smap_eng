import Foundation
import Observation

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

    /// 현재 진행 중인 reading_log id. 외부(QuizView)가 점수 PATCH 시 참조한다.
    private(set) var readingLogId: Int?

    /// 마지막으로 TTS 합성이 진행 중인 passage id. UI 인디케이터용.
    private(set) var synthesizingPassageId: Int?

    /// 장면 이미지 생성이 진행 중인 passage id. UI 인디케이터용.
    private(set) var generatingScenePassageId: Int?

    private var hasReportedFinish: Bool = false

    init(book: Book, profileId: Int) {
        self.book = book
        self.profileId = profileId
    }

    func bootstrap() async {
        async let detail: Void = loadDetail()
        async let log: Void = startLog()
        _ = await (detail, log)
    }

    func reportPageChanged(to newIndex: Int) async {
        currentIndex = newIndex
        guard !passages.isEmpty else { return }
        let total = max(passages.count, 1)
        let ratio = Double(newIndex + 1) / Double(total)
        await patchLog(progressRatio: ratio, finishedAtUnix: nil)
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
            let response: TtsResponse = try await APIClient.shared.send(
                Endpoint(path: "/api/tts/\(passage.id)", method: .post, requiresAuth: true)
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
            self.error = "오디오 준비 실패: \(error.localizedDescription)"
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
            self.error = "삽화 생성 실패: \(error.localizedDescription)"
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
