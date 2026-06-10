import Foundation
import Observation
import StoreKit

/// HomeRouter NavigationStack 경로 값 — 책장 헤더의 별 잔액 카드 탭 시 사용.
struct StoreDestination: Hashable {}

/// `Transaction.updates`를 앱 수명주기 동안 단 하나로 상주시키는 거래 관찰자.
///
/// 화면(StoreViewModel) 수명주기에 묶으면 Ask to Buy 승인·앱 재시작 후 unfinished
/// transaction이 사용자가 우연히 스토어 화면을 다시 열기 전까지 적립되지 않는다.
/// `HaruBookApp`이 앱 시작 시 `start()`를 1회 호출한다.
///
/// 검증 경로(직접 purchase 결과 / Transaction.updates)는 모두 `handleVerification`으로 합류:
///   1. JWS를 백엔드에 전송 → 검증 + 적립 응답
///   2. 성공 시 `Transaction.finish()` 호출 (재시도 큐에서 제거)
@Observable
@MainActor
final class IapTransactionObserver {
    static let shared = IapTransactionObserver()

    /// 마지막으로 적립된 별 수 — StoreView가 성공 알럿/잔액 갱신에 사용 후 nil로 리셋한다.
    var lastGrantedStars: Int?
    /// 서버 검증 실패 메시지 — StoreView가 표시.
    var verifyErrorMessage: String?

    @ObservationIgnored private var listenerTask: Task<Void, Never>?

    private init() {}

    /// 앱 시작 시 1회 호출. 중복 호출은 무시(멱등).
    func start() {
        guard listenerTask == nil else { return }
        listenerTask = Task.detached(priority: .background) { [weak self] in
            for await result in Transaction.updates {
                await self?.handleVerification(result)
            }
        }
    }

    /// 모든 검증 경로의 공용 처리. 백엔드 검증 성공 시 `transaction.finish()`로 큐에서 제거한다.
    func handleVerification(
        _ result: VerificationResult<Transaction>,
    ) async {
        // jwsRepresentation은 verified/unverified 모두 존재. 서버가 다시 검증하므로 둘 다 전송.
        let jws = result.jwsRepresentation
        let transaction: Transaction?
        switch result {
        case .verified(let tx):
            transaction = tx
        case .unverified(let tx, _):
            transaction = tx
        }

        do {
            let response: VerifyResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/iap/verify",
                    method: .post,
                    body: VerifyRequest(jws: jws),
                    requiresAuth: true,
                ),
            )
            if response.granted, let stars = response.stars {
                lastGrantedStars = stars
                Haptic.play(.success)
            }
            // 멱등 응답(granted=false)도 finish — 이미 처리된 거래라 큐에서 제거 OK.
            await transaction?.finish()
        } catch {
            // 서버 검증 실패 → finish 하지 않는다. StoreKit이 다음 앱 시작 시 다시 전달.
            verifyErrorMessage = "결제 확인에 실패했어요. 잠시 후 다시 시도해 주세요."
            Haptic.play(.error)
        }
    }
}

/// 별 충전(IAP) ViewModel — StoreKit 2. UI 상태(상품 목록/진행/메시지)만 담당하고,
/// 거래 검증·적립은 앱 수명주기 싱글톤 `IapTransactionObserver`로 위임한다.
///
/// 흐름:
///   1. `load()` — `Product.products(for:)`로 가격 정보 로드
///   2. `purchase(_:)` — `product.purchase()` 호출 → `VerificationResult` 수신
///   3. `IapTransactionObserver.handleVerification`으로 검증/적립/finish 위임
@Observable
@MainActor
final class StoreViewModel {
    static let productIds: [String] = [
        "com.smap.harubook.star_small",
        "com.smap.harubook.star_medium",
        "com.smap.harubook.star_large",
    ]

    private(set) var products: [Product] = []
    var isLoading: Bool = false
    var purchasingProductId: String?
    var errorMessage: String?
    /// 실패가 아닌 중립 안내(Ask to Buy 승인 대기 등) — errorMessage와 분리해 danger 색을 피한다.
    var infoMessage: String?

    // MARK: - Product loading

    func load() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            let fetched = try await Product.products(for: Self.productIds)
            // App Store Connect 등록 순서대로 정렬 (낮은 가격 → 높은 가격).
            self.products = fetched.sorted { $0.price < $1.price }
        } catch {
            self.errorMessage = "상품 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
        }
    }

    // MARK: - Purchase

    func purchase(_ product: Product) async {
        guard purchasingProductId == nil else { return }
        purchasingProductId = product.id
        defer { purchasingProductId = nil }
        errorMessage = nil
        infoMessage = nil

        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                await IapTransactionObserver.shared.handleVerification(verification)
            case .userCancelled:
                break
            case .pending:
                // Ask to Buy 등 — 결제 승인 대기. 승인되면 Transaction.updates로 전달됨.
                infoMessage = "결제 승인을 기다리고 있어요."
            @unknown default:
                errorMessage = "알 수 없는 응답을 받았어요."
            }
        } catch {
            errorMessage = "결제에 실패했어요. 잠시 후 다시 시도해 주세요."
        }
    }
}

private struct VerifyRequest: Encodable {
    let jws: String
}

private struct VerifyResponse: Decodable {
    let granted: Bool
    let balance: Int?
    let stars: Int?
    let idempotent: Bool?
    let productId: String?
}
