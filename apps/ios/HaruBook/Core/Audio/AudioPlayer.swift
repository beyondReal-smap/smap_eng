import AVFoundation
import Foundation
import Observation

/// passage 단위 오디오 재생기.
///
/// 백엔드 TTS는 `/audio/passage-N.mp3` 같은 인증 게이트 경로를 반환하므로,
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
    /// 일시정지 여부. `player`가 @ObservationIgnored라 pause/play 자체는 뷰에 전파되지
    /// 않으므로, 버튼 라벨("듣기"↔"정지")이 pause에 반응하려면 이 관찰 가능 플래그가 필요하다.
    private(set) var isPaused: Bool = false
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

    /// 해당 passage가 "실제로 소리를 내며 재생 중"인지 — 버튼 라벨/본문 하이라이트 판정용.
    /// nowPlayingPassageId만 보면 pause 상태에서도 true라 "정지" 라벨이 고착된다.
    func isActivelyPlaying(passageId: Int) -> Bool {
        nowPlayingPassageId == passageId && !isPaused
    }

    /// passage 재생 토글.
    /// - 이미 같은 passage가 재생 중이면 일시정지, 일시정지 상태면 재개, 다른 passage면 교체 재생.
    func toggle(passageId: Int, audioPath: String?) {
        if nowPlayingPassageId == passageId {
            if let player = player {
                if player.isPlaying {
                    player.pause()
                    isPaused = true
                } else {
                    player.play()
                    isPaused = false
                }
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
        isPaused = false
        preparingPassageId = nil
        inFlightTask?.cancel()
        inFlightTask = nil
    }

    private func startNew(passageId: Int, audioPath: String) {
        inFlightTask?.cancel()
        // 이전 passage 오디오를 즉시 정지 — 새 오디오 다운로드/디코드 동안(수 초)
        // 이전 문장이 계속 낭독되어 두 소리가 겹치는 혼란을 막는다.
        player?.stop()
        player = nil
        preparingPassageId = passageId
        nowPlayingPassageId = nil
        isPaused = false

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
                self.isPaused = false
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
            self?.isPaused = false
        }
    }
}
