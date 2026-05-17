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

    #if DEBUG
    /// `--mock-auth` 진입 여부. `handleUnauthorized()`를 무시하기 위한 가드.
    @ObservationIgnored private(set) var isMockSession = false
    #endif

    init() {}

    // MARK: - Bootstrap

    func bootstrap() async {
        if phase == .signedIn { return }

        #if DEBUG
        if let mock = MockAuthArgs.fromProcess() {
            await attemptDevSignIn(email: mock.email, secret: mock.secret)
            return
        }
        #endif

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
        #if DEBUG
        isMockSession = false
        #endif
    }

    func handleUnauthorized() {
        #if DEBUG
        // 모의 세션은 백엔드가 토큰을 모르므로 모든 인증 API가 401을 반환한다.
        // 자동 signOut() 시 즉시 LoginView로 복귀해 UI 탐색이 불가능해지므로 무시한다.
        if isMockSession {
            lastError = "[mock-auth] API 401 무시"
            return
        }
        #endif
        signOut()
        lastError = "로그인이 만료되었습니다. 다시 로그인해 주세요."
    }

    #if DEBUG
    /// `--mock-auth` 런치 아규먼트 + `MOCK_AUTH_SECRET` env로 진입한 시뮬레이터/UITest용.
    /// 백엔드 dev-issue 엔드포인트를 호출해 실제 사용자 계정으로 발급된 access_token을 받는다.
    /// 성공: 그 이메일로 OAuth 로그인한 것과 동일한 세션. 모든 인증 API 정상.
    /// 실패: 더미 토큰 + `isMockSession=true`로 fallback — 401 무시 모드로 UI 탐색만 가능.
    func attemptDevSignIn(email: String, secret: String) async {
        do {
            let response = try await requestDevToken(email: email, secret: secret)
            accessToken = response.accessToken
            accessExpiresAt = response.expiresAt
            phase = .signedIn
            lastError = nil
            // 진짜 토큰이므로 isMockSession은 false 유지 — 정상 401 핸들러로 동작해야 한다.
        } catch {
            lastError = "[mock-auth] dev-issue 실패: \(error.localizedDescription)"
            injectMockSession()
        }
    }

    /// `--mock-auth`만 있고 dev-issue 발급이 불가능한 경우의 fallback. OAuth WebView 우회만 됨.
    /// Mock 세션은 Keychain에 영속화하지 않아 다음 부팅 흐름을 오염시키지 않는다.
    func injectMockSession(
        token: String = "mock-access-token",
        expiresInSeconds: TimeInterval = 3600,
    ) {
        accessToken = token
        accessExpiresAt = Date().addingTimeInterval(expiresInSeconds)
        phase = .signedIn
        lastError = nil
        isMockSession = true
    }

    private func requestDevToken(email: String, secret: String) async throws -> MobileExchangeResponse {
        var request = URLRequest(
            url: AppConfig.apiBaseURL.appendingPathComponent("/api/auth/mobile/dev-issue"),
        )
        request.httpMethod = "POST"
        request.timeoutInterval = 10
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(secret, forHTTPHeaderField: "X-Dev-Auth-Secret")
        request.httpBody = try JSONEncoder().encode(["email": email])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw URLError(.userAuthenticationRequired, userInfo: [
                NSLocalizedDescriptionKey: "dev-issue HTTP \(http.statusCode)",
            ])
        }
        return try JSONDecoder().decode(MobileExchangeResponse.self, from: data)
    }
    #endif

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

#if DEBUG
/// `--mock-auth` 런치 아규먼트 + `MOCK_AUTH_SECRET` env 파싱 헬퍼.
/// 둘 중 하나라도 누락이면 mock 진입 자체를 시도하지 않는다 — 정상 OAuth 흐름으로 진행.
struct MockAuthArgs {
    let email: String
    let secret: String

    static func fromProcess() -> MockAuthArgs? {
        let args = ProcessInfo.processInfo.arguments
        guard args.contains("--mock-auth") else { return nil }

        let secret = ProcessInfo.processInfo.environment["MOCK_AUTH_SECRET"] ?? ""
        guard !secret.isEmpty else { return nil }

        let prefix = "--mock-auth-email="
        let email = args.first(where: { $0.hasPrefix(prefix) })
            .map { String($0.dropFirst(prefix.count)) }
            ?? "beyondrealsmap@gmail.com"

        return MockAuthArgs(email: email, secret: secret)
    }
}
#endif
