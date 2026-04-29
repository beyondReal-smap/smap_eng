import XCTest
@testable import HaruBook

final class PKCETests: XCTestCase {
    func testVerifierIsBase64URL() {
        let verifier = PKCE.generateVerifier()
        XCTAssertFalse(verifier.contains("+"))
        XCTAssertFalse(verifier.contains("/"))
        XCTAssertFalse(verifier.contains("="))
    }

    func testVerifierLengthFor32Bytes() {
        // 32 byte SHA = 256 bit → base64url 패딩 제외 43자
        let verifier = PKCE.generateVerifier(byteLength: 32)
        XCTAssertEqual(verifier.count, 43)
    }

    /// RFC 7636 Appendix B 검증 벡터.
    func testChallengeMatchesRFC7636Vector() {
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        let expected = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        XCTAssertEqual(PKCE.challenge(for: verifier), expected)
    }

    func testChallengeIsBase64URL() {
        let verifier = PKCE.generateVerifier()
        let challenge = PKCE.challenge(for: verifier)
        XCTAssertEqual(challenge.count, 43)
        XCTAssertFalse(challenge.contains("+"))
        XCTAssertFalse(challenge.contains("/"))
        XCTAssertFalse(challenge.contains("="))
    }
}
