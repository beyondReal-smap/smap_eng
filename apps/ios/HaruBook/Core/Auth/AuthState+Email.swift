import Foundation

extension AuthState {
    /// 이메일 + 비밀번호 로그인 — `POST /api/auth/mobile/password` 호출 후 토큰 저장.
    /// 실패 시 `lastError`를 설정하고 false 반환. 호출자(EmailLoginView)는 폼에 inline 에러 표시.
    @discardableResult
    func signInWithEmail(email: String, password: String) async -> Bool {
        do {
            let response: MobileExchangeResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/auth/mobile/password",
                    method: .post,
                    body: PasswordRequest(email: email, password: password),
                    requiresAuth: false,
                ),
            )
            applyExchange(response)
            return true
        } catch let apiError as APIError {
            // APIError가 도메인 code(`invalid_credentials` 등)와 HTTP status를 친화 문구로 매핑한다.
            lastError = apiError.localizedDescription
            return false
        } catch {
            lastError = error.localizedDescription
            return false
        }
    }

    /// 이메일 회원가입 — `POST /api/auth/mobile/signup`.
    /// 서버는 가입 + 기본 프로필 생성 + access_token 즉시 발급을 한 번에 처리한다.
    /// 성공 시 토큰을 저장하고 true 반환. 호출자는 곧바로 다음 화면(Onboarding 또는 책장)으로 진입.
    @discardableResult
    func signUp(
        childName: String,
        email: String,
        password: String,
        agreeAge: Bool,
        agreeTerms: Bool,
        agreePrivacy: Bool,
    ) async -> SignupOutcome {
        do {
            let response: MobileExchangeResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/auth/mobile/signup",
                    method: .post,
                    body: SignupRequest(
                        childName: childName,
                        email: email,
                        password: password,
                        agreeAge: agreeAge,
                        agreeTerms: agreeTerms,
                        agreePrivacy: agreePrivacy,
                    ),
                    requiresAuth: false,
                ),
            )
            applyExchange(response)
            return .success
        } catch APIError.http(let status, let code, _) {
            if status == 409 || code == "duplicate_email" {
                return .duplicateEmail
            }
            // 중복이 아닌 경우는 APIError가 매핑한 친화 문구를 그대로 사용.
            let mapped = APIError.http(status: status, code: code, message: nil).errorDescription
                ?? "가입에 실패했어요. 입력값을 확인해 주세요."
            lastError = mapped
            return .failure(mapped)
        } catch {
            lastError = error.localizedDescription
            return .failure(lastError ?? "")
        }
    }
}

enum SignupOutcome: Equatable {
    case success
    case duplicateEmail
    case failure(String)
}

/// `POST /api/auth/mobile/password` 본문.
struct PasswordRequest: Encodable {
    let email: String
    let password: String
}

/// `POST /api/auth/mobile/signup` 본문.
/// `SignupSchema`(웹)의 키와 동일하다. 동의 필드는 boolean true로 전송 — 서버 스키마가 허용.
struct SignupRequest: Encodable {
    let childName: String
    let email: String
    let password: String
    let agreeAge: Bool
    let agreeTerms: Bool
    let agreePrivacy: Bool
}
