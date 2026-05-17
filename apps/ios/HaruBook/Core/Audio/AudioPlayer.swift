import AVFoundation
import Foundation
import Observation

/// passage 단위 오디오 재생기.
///
/// 백엔드 TTS는 `/audio/passage-N.wav` 같은 인증 게이트 경로를 반환하므로,
/// 단순히 URL을 `AVPlayer` 에 넘기는 대신 `Authorization: Bearer …` 헤더를 부착해
/// 데이터를 다운로드한 뒤 `AVAudioPlayer`(in-memory) 로 재생한다.
///
/// 동시에 여러 passage가 재생되지 않도록 단일 actor 인스턴스(`shared`)에서 모든 재생을 관리한다.
@Observable
@MainActor
final class AudioPlayer: NSObject, AVAudioPlayerDelegate {
    static let shared = AudioPlayer()

    /// 현재 재생 중인 passage id. nil 이면 정지 상태.
    private(set) var nowPlayingPassageId: Int?
    /// 다운로드/디코드 중인 passage id (UI 인디케이터용).
    private(set) var preparingPassageId: Int?
    /// 마지막으로 발생한 사용자용 에러 메시지.
    var lastError: String?

    @ObservationIgnored private var player: AVAudioPlayer?
    @ObservationIgnored private var memoryCache: [Int: Data] = [:]
    @ObservationIgnored private var inFlightTask: Task<Void, Never>?

    override init() {
        super.init()
    }

    var isPlaying: Bool { nowPlayingPassageId != nil && (player?.isPlaying ?? false) }

    /// passage 재생 토글.
    /// - 이미 같은 passage가 재생 중이면 일시정지, 일시정지 상태면 재개, 다른 passage면 교체 재생.
    func toggle(passageId: Int, audioPath: String?) {
        if nowPlayingPassageId == passageId {
            if let player = player {
                if player.isPlaying { player.pause() } else { player.play() }
            }
            return
        }
        guard let path = audioPath, !path.isEmpty else {
            // audioPath 미보유 → TTS 합성 요청은 ReaderViewModel이 담당.
            lastError = "오디오가 아직 준비되지 않았습니다."
            return
        }
        startNew(passageId: passageId, audioPath: path)
    }

    func stop() {
        player?.stop()
        player = nil
        nowPlayingPassageId = nil
        preparingPassageId = nil
        inFlightTask?.cancel()
        inFlightTask = nil
    }

    private func startNew(passageId: Int, audioPath: String) {
        inFlightTask?.cancel()
        preparingPassageId = passageId
        nowPlayingPassageId = nil

        inFlightTask = Task { [weak self] in
            guard let self else { return }
            do {
                let data = try await self.fetchData(passageId: passageId, audioPath: audioPath)
                try self.activateSession()
                let p = try AVAudioPlayer(data: data)
                p.delegate = self
                p.prepareToPlay()
                p.play()
                self.player = p
                self.nowPlayingPassageId = passageId
                self.preparingPassageId = nil
                self.lastError = nil
            } catch is CancellationError {
                // 다른 passage가 들어오면서 취소 — silent
            } catch {
                self.preparingPassageId = nil
                // APIError가 매핑한 친화 문구를 우선 사용. 그 외 시스템 오류는 일반 문구.
                if let apiError = error as? APIError, let desc = apiError.errorDescription {
                    self.lastError = desc
                } else {
                    self.lastError = "음성을 재생하지 못했어요. 잠시 후 다시 시도해 주세요."
                }
            }
        }
    }

    private func fetchData(passageId: Int, audioPath: String) async throws -> Data {
        if let cached = memoryCache[passageId] { return cached }

        let url = AppConfig.apiBaseURL.appendingPathComponent(audioPath)
        var request = URLRequest(url: url)
        if let token = AuthState.shared.peekAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.invalidResponse
        }
        // LRU-lite: 최대 5개 캐시
        memoryCache[passageId] = data
        if memoryCache.count > 5, let first = memoryCache.keys.first(where: { $0 != passageId }) {
            memoryCache.removeValue(forKey: first)
        }
        return data
    }

    private func activateSession() throws {
        try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [])
        try AVAudioSession.sharedInstance().setActive(true)
    }

    // MARK: - AVAudioPlayerDelegate (nonisolated 진입점)

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor [weak self] in
            self?.nowPlayingPassageId = nil
        }
    }
}
