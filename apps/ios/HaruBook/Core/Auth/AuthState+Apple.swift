import Foundation
import AuthenticationServices
import CryptoKit

extension AuthState {
    /// `SignInWithAppleButton`이 완료 시 호출하는 진입점.
    ///
    /// 흐름:
    ///   1. 부모 뷰가 random nonce를 만들고 `AppleSignInNonce` 인스턴스를 보관
    ///   2. Apple Request의 `nonce`에는 `nonce.hashed`(SHA256 hex)를 설정
    ///   3. Apple이 인증한 후 ASAuthorization으로 identityToken을 돌려줌
    ///   4. 이 메서드를 호출 — raw nonce + identityToken을 백엔드로 전송
    ///   5. 백엔드가 JWT 서명 + nonce hash 검증 후 access_token 발급
    @MainActor
    func signInWithApple(authorization: ASAuthorization, rawNonce: String) async {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            lastError = "Apple 로그인 응답 형식이 올바르지 않습니다."
            return
        }
        guard let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8) else {
            lastError = "Apple 토큰을 찾을 수 없습니다."
            return
        }

        let fullName: AppleSignInRequest.FullName?
        if let names = credential.fullName,
           names.givenName != nil || names.familyName != nil {
            fullName = AppleSignInRequest.FullName(
                givenName: names.givenName,
                familyName: names.familyName,
            )
        } else {
            fullName = nil
        }

        let request = AppleSignInRequest(
            identityToken: identityToken,
            nonce: rawNonce,
            email: credential.email,
            fullName: fullName,
        )

        do {
            let response: MobileExchangeResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/auth/mobile/apple",
                    method: .post,
                    body: request,
                    requiresAuth: false,
                ),
            )
            applyExchange(response)
        } catch APIError.http(_, _, let message) {
            lastError = message ?? "Apple 로그인에 실패했어요. 잠시 후 다시 시도해 주세요."
        } catch {
            lastError = "Apple 로그인 실패: \(error.localizedDescription)"
        }
    }

    func handleAppleError(_ error: Error) {
        // 사용자가 시트를 취소한 경우는 에러로 표시하지 않는다.
        let nsError = error as NSError
        if nsError.domain == ASAuthorizationError.errorDomain,
           nsError.code == ASAuthorizationError.canceled.rawValue {
            lastError = nil
            return
        }
        lastError = "Apple 로그인 실패: \(error.localizedDescription)"
    }
}

/// Apple Sign In용 일회성 nonce.
/// raw는 백엔드 검증용으로 클라이언트가 보관, hashed(SHA256 hex)는 Apple Request에 전달.
struct AppleSignInNonce {
    let raw: String
    let hashed: String

    static func make() -> AppleSignInNonce {
        var bytes = [UInt8](repeating: 0, count: 32)
        let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        if status != errSecSuccess {
            // 보안 난수 실패 — 폴백 UUID 2개로 충분한 엔트로피 확보.
            let fallback = UUID().uuidString + UUID().uuidString
            let raw = fallback.replacingOccurrences(of: "-", with: "").lowercased()
            return AppleSignInNonce(raw: raw, hashed: sha256Hex(raw))
        }
        let raw = bytes.map { String(format: "%02x", $0) }.joined()
        return AppleSignInNonce(raw: raw, hashed: sha256Hex(raw))
    }

    private static func sha256Hex(_ input: String) -> String {
        let digest = SHA256.hash(data: Data(input.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

/// `POST /api/auth/mobile/apple` 본문.
struct AppleSignInRequest: Encodable {
    let identityToken: String
    let nonce: String
    let email: String?
    let fullName: FullName?

    struct FullName: Encodable {
        let givenName: String?
        let familyName: String?
    }
}
