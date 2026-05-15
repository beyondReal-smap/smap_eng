import Foundation
import UIKit
import AuthenticationServices

/// `ASAuthorizationController`를 직접 다루는 SwiftUI 친화적 헬퍼.
/// SwiftUI의 `SignInWithAppleButton`을 쓰지 않고 커스텀 PrimaryButton에서 동일한 흐름을
/// 호출하기 위해 사용한다 (App Store Review Guideline 4.8 — 커스텀 버튼 + 표준 흐름).
///
/// 사용:
///   let coordinator = AppleSignInCoordinator()
///   coordinator.onCompletion = { result in ... }
///   coordinator.start(nonceHashed: nonce.hashed)
///
/// 메모리: ASAuthorizationController가 강한 참조를 잡지 않으므로 호출자가 coordinator를
/// 보관해야 한다. LoginView는 @State 로 보관.
@MainActor
final class AppleSignInCoordinator: NSObject,
    ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding {

    var onCompletion: ((Result<ASAuthorization, Error>) -> Void)?
    private var controller: ASAuthorizationController?

    func start(nonceHashed: String) {
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = nonceHashed

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        self.controller = controller
        controller.performRequests()
    }

    nonisolated func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization,
    ) {
        Task { @MainActor in
            self.onCompletion?(.success(authorization))
            self.controller = nil
        }
    }

    nonisolated func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error,
    ) {
        Task { @MainActor in
            self.onCompletion?(.failure(error))
            self.controller = nil
        }
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // foreground UIWindowScene 의 keyWindow를 반환. fallback으로 임시 anchor.
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
            ?? UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        return scene?.keyWindow ?? ASPresentationAnchor()
    }
}
