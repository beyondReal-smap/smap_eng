import Foundation
import CryptoKit
import Observation

/// 보호자 PIN 관리 — COPPA Level-1 "아이 실수 진입 방지" 수준.
///
/// 저장소: **Keychain**(웹은 localStorage). PIN 해시 + salt로 저장하고 단말 분실 시
/// 추가 보호 위해 `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`를 적용한다(`KeychainStore`).
///
/// 잠금/해제:
///  - `unlock(...)` 통과 시 메모리 unlockedUntil = now + 30분.
///  - 30분 이내 재진입은 자동 통과(PIN 재입력 불필요).
///  - 30분 경과 또는 `lock()` 호출 시 다시 PIN 입력 요구.
///
/// 이 PIN은 FTC가 정의한 "검증 가능한 보호자 동의(VPC)"가 아니다 — 아동 개인정보 수집
/// 기능(서버 업로드 등)에는 Level-2 VPC가 별도 필요.
@Observable
@MainActor
final class ParentalPinStore {
    static let shared = ParentalPinStore()

    private enum Keys {
        static let pinHash = "parental_pin.hash"
    }

    private static let salt = "smap-eng:parental-pin:v1"
    private static let unlockTTL: TimeInterval = 30 * 60

    private(set) var hasPin: Bool = false
    @ObservationIgnored private var unlockedUntil: Date?

    @ObservationIgnored private let keychain = KeychainStore()

    init() {
        self.hasPin = (try? keychain.loadString(for: Keys.pinHash)) != nil
    }

    // MARK: - State

    /// 현재 잠금 해제 상태 — 30분 TTL 적용.
    var isUnlocked: Bool {
        guard let until = unlockedUntil else { return false }
        if Date() < until { return true }
        // 만료된 토큰 정리.
        unlockedUntil = nil
        return false
    }

    var remainingUnlockSeconds: Int {
        guard let until = unlockedUntil else { return 0 }
        return Swift.max(0, Int(until.timeIntervalSinceNow))
    }

    // MARK: - PIN setup / verify

    /// 신규 PIN 설정. 이미 설정돼 있어도 덮어쓴다(설정 화면에서 안내 후 호출).
    func setPin(_ pin: String) throws {
        let hashed = Self.hash(pin)
        try keychain.saveString(hashed, for: Keys.pinHash)
        hasPin = true
        unlockedUntil = Date().addingTimeInterval(Self.unlockTTL)
    }

    /// 입력된 PIN을 저장된 해시와 비교. 일치하면 30분 잠금 해제.
    @discardableResult
    func unlock(with pin: String) -> Bool {
        guard let stored = try? keychain.loadString(for: Keys.pinHash) else {
            return false
        }
        let input = Self.hash(pin)
        // timing-safe 비교는 4자리 PIN에서 의미가 미미. 단순 비교 사용.
        guard input == stored else { return false }
        unlockedUntil = Date().addingTimeInterval(Self.unlockTTL)
        return true
    }

    /// 즉시 잠금. PIN 자체는 유지.
    func lock() {
        unlockedUntil = nil
    }

    /// PIN 자체를 삭제. 호출 후 재설정 흐름으로 분기.
    func reset() {
        try? keychain.delete(for: Keys.pinHash)
        hasPin = false
        unlockedUntil = nil
    }

    // MARK: - Crypto

    private static func hash(_ pin: String) -> String {
        let data = Data("\(salt):\(pin)".utf8)
        let digest = SHA256.hash(data: data)
        let hex = digest.map { String(format: "%02x", $0) }.joined()
        return "sha256:\(hex)"
    }
}
