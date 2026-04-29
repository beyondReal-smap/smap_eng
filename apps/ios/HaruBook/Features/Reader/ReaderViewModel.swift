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

    private var logId: Int?
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
    }

    func toggleKorean() {
        showsKorean.toggle()
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
            self.logId = response.log.id
        } catch {
            // 로그 생성 실패는 사용자 흐름을 막지 않는다 (소프트 페일).
        }
    }

    private func patchLog(progressRatio: Double?, finishedAtUnix: Int?) async {
        guard let logId else { return }
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
