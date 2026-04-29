import AuthenticationServices
import UIKit

@MainActor
final class WebAuthRunner: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = WebAuthRunner()

    enum WebAuthError: Error, LocalizedError {
        case startFailed
        case noCallback

        var errorDescription: String? {
            switch self {
            case .startFailed: return "외부 인증 세션을 시작할 수 없습니다."
            case .noCallback: return "인증 콜백을 받지 못했습니다."
            }
        }
    }

    /// `ASWebAuthenticationSession`을 띄우고 콜백 URL을 반환한다.
    /// 사용자가 닫거나 시스템이 취소하면 `ASWebAuthenticationSessionError.canceledLogin`이 throw된다.
    func start(url: URL, callbackURLScheme: String) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackURLScheme
            ) { callbackURL, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let callbackURL {
                    continuation.resume(returning: callbackURL)
                } else {
                    continuation.resume(throwing: WebAuthError.noCallback)
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            if !session.start() {
                continuation.resume(throwing: WebAuthError.startFailed)
            }
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let activeScene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first(where: { $0.activationState == .foregroundActive })
        return activeScene?.keyWindow ?? ASPresentationAnchor()
    }
}
