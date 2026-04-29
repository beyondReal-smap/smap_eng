import Foundation
import Observation

private struct StoredSession: Codable {
    let accessToken: String
    let accessExpiresAt: Date
}

private enum KeychainKey {
    static let session = "auth.session"
}

/// 모바일 OAuth 결과 토큰 + 만료를 보관한다.
///
/// 백엔드는 access_token 30일 TTL을 발급하고 refresh를 제공하지 않으므로
/// 만료/401 시점에는 LoginView로 복귀해 재로그인한다.
@Observable
@MainActor
final class AuthState {
    static let shared = AuthState()

    enum Phase: Equatable {
        case loading
        case signedOut
        case signedIn
    }

    private(set) var phase: Phase = .loading
    var lastError: String?

    @ObservationIgnored private var accessToken: String?
    @ObservationIgnored private var accessExpiresAt: Date?
    @ObservationIgnored private let keychain = KeychainStore()

    init() {}

    // MARK: - Bootstrap

    func bootstrap() async {
        if phase == .signedIn { return }

        // 첫 부팅엔 Keychain이 비어있는 게 정상 시나리오이므로 실패는 조용히 무시한다.
        let stored = try? keychain.loadCodable(StoredSession.self, for: KeychainKey.session)
        if let stored, stored.accessExpiresAt > Date() {
            accessToken = stored.accessToken
            accessExpiresAt = stored.accessExpiresAt
            phase = .signedIn
        } else {
            if stored != nil {
                try? keychain.delete(for: KeychainKey.session)
            }
            phase = .signedOut
        }
    }

    // MARK: - Sign in / out

    func applyExchange(_ response: MobileExchangeResponse) {
        accessToken = response.accessToken
        accessExpiresAt = response.expiresAt
        phase = .signedIn
        lastError = nil
        persist()
    }

    func signOut() {
        accessToken = nil
        accessExpiresAt = nil
        try? keychain.delete(for: KeychainKey.session)
        phase = .signedOut
    }

    func handleUnauthorized() {
        signOut()
        lastError = "로그인이 만료되었습니다. 다시 로그인해 주세요."
    }

    // MARK: - Token access

    func peekAccessToken() -> String? {
        accessToken
    }

    // MARK: - Private

    private func persist() {
        guard let accessToken, let accessExpiresAt else { return }
        let stored = StoredSession(accessToken: accessToken, accessExpiresAt: accessExpiresAt)
        try? keychain.saveCodable(stored, for: KeychainKey.session)
    }
}

// MARK: - Wire types

/// 백엔드 `POST /api/auth/mobile/exchange` 응답.
///
/// ```json
/// { "accessToken": "…", "expiresAtUnix": 1730000000, "issuedAtUnix": 1727408000 }
/// ```
struct MobileExchangeResponse: Decodable {
    let accessToken: String
    let expiresAt: Date
    let issuedAt: Date

    enum CodingKeys: String, CodingKey {
        case accessToken
        case expiresAtUnix
        case issuedAtUnix
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        accessToken = try container.decode(String.self, forKey: .accessToken)
        let expiresUnix = try container.decode(Double.self, forKey: .expiresAtUnix)
        let issuedUnix = try container.decodeIfPresent(Double.self, forKey: .issuedAtUnix) ?? Date().timeIntervalSince1970
        expiresAt = Date(timeIntervalSince1970: expiresUnix)
        issuedAt = Date(timeIntervalSince1970: issuedUnix)
    }
}
