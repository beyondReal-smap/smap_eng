import Foundation
import CryptoKit

/// RFC 7636 PKCE (S256 only).
///
/// - `verifier`: `[A-Z][a-z][0-9]-._~` 문자만 포함된 43~128자 base64url 문자열.
/// - `challenge`: `base64url(SHA256(verifier))` (32바이트 → 43자 무패딩).
enum PKCE {
    static func generateVerifier(byteLength: Int = 32) -> String {
        precondition(byteLength >= 32 && byteLength <= 96, "PKCE verifier byte length out of range")
        var bytes = [UInt8](repeating: 0, count: byteLength)
        let status = SecRandomCopyBytes(kSecRandomDefault, byteLength, &bytes)
        precondition(status == errSecSuccess, "SecRandomCopyBytes failed: \(status)")
        return Data(bytes).base64URLEncoded()
    }

    static func challenge(for verifier: String) -> String {
        let digest = SHA256.hash(data: Data(verifier.utf8))
        return Data(digest).base64URLEncoded()
    }
}

extension Data {
    func base64URLEncoded() -> String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
