import Foundation

extension AuthState {
    /// OAuth 시작 → ASWebAuthenticationSession → exchange → 토큰 저장.
    func signIn(provider: String) async {
        do {
            let verifier = PKCE.generateVerifier()
            let challenge = PKCE.challenge(for: verifier)

            let startURL = try makeMobileStartURL(provider: provider, challenge: challenge)
            let callbackURL = try await WebAuthRunner.shared.start(
                url: startURL,
                callbackURLScheme: AppConfig.authCallbackScheme
            )

            guard let code = extractExchangeCode(from: callbackURL) else {
                lastError = "로그인을 완료하지 못했어요. 다시 시도해 주세요."
                return
            }

            let response: MobileExchangeResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/auth/mobile/exchange",
                    method: .post,
                    body: ExchangeRequest(code: code, codeVerifier: verifier),
                    requiresAuth: false
                )
            )

            applyExchange(response)
        } catch {
            // 사용자가 시스템 시트에서 취소하면 ASWebAuthenticationSessionError.canceledLogin (1).
            if let nsError = error as NSError?,
               nsError.domain == "com.apple.AuthenticationServices.WebAuthenticationSession",
               nsError.code == 1 {
                lastError = nil
            } else {
                lastError = error.localizedDescription
            }
        }
    }

    private func makeMobileStartURL(provider: String, challenge: String) throws -> URL {
        var components = URLComponents(
            url: AppConfig.apiBaseURL.appendingPathComponent("/api/auth/mobile/start"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(name: "provider", value: provider),
            URLQueryItem(name: "redirect", value: AppConfig.authCallbackURL.absoluteString),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256")
        ]
        guard let url = components?.url else { throw APIError.invalidURL }
        return url
    }

    private func extractExchangeCode(from url: URL) -> String? {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return nil
        }
        return components.queryItems?.first(where: { $0.name == "code" })?.value
    }
}

/// `POST /api/auth/mobile/exchange` 요청 본문은 RFC 7636 PKCE 표준 키(snake_case)를 사용한다.
struct ExchangeRequest: Encodable {
    let code: String
    let codeVerifier: String

    enum CodingKeys: String, CodingKey {
        case code
        case codeVerifier = "code_verifier"
    }
}
