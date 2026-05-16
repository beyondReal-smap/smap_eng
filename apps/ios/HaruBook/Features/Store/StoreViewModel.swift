import Foundation
import Observation
import StoreKit

/// HomeRouter NavigationStack 경로 값 — 책장 헤더의 별 잔액 카드 탭 시 사용.
struct StoreDestination: Hashable {}

/// 별 충전(IAP) ViewModel — StoreKit 2.
///
/// 흐름:
///   1. `load()` — `Product.products(for:)`로 가격 정보 로드
///   2. `purchase(_:)` — `product.purchase()` 호출 → `VerificationResult` 수신
///   3. JWS를 백엔드에 전송 → 검증 + 적립 응답
///   4. 성공 시 `Transaction.finish()` 호출 (재시도 큐에서 제거)
///
/// 또한 `Transaction.updates` listener를 별도 Task로 띄워:
///   - 다른 기기에서 발생한 거래
///   - 앱 시작 시 unfinished transaction 잔여 처리
///   - StoreKit이 재발급한 trasanction
///   모두 같은 검증 경로로 흘려보낸다.
@Observable
@MainActor
final class StoreViewModel {
    static let productIds: [String] = [
        "site.smap.harubook.star_small",
        "site.smap.harubook.star_medium",
        "site.smap.harubook.star_large",
    ]

    private(set) var products: [Product] = []
    var isLoading: Bool = false
    var purchasingProductId: String?
    var errorMessage: String?
    var lastGrantedStars: Int?

    @ObservationIgnored private var listenerTask: Task<Void, Never>?

    init() {
        listenerTask = Task.detached(priority: .background) { [weak self] in
            for await result in Transaction.updates {
                await self?.handleVerification(result)
            }
        }
    }

    deinit {
        listenerTask?.cancel()
    }

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

        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                await handleVerification(verification)
            case .userCancelled:
                break
            case .pending:
                // Ask to Buy 등 — 결제 승인 대기. 승인되면 Transaction.updates로 전달됨.
                errorMessage = "결제 승인을 기다리고 있어요."
            @unknown default:
                errorMessage = "알 수 없는 응답을 받았어요."
            }
        } catch {
            errorMessage = "결제에 실패했어요. 잠시 후 다시 시도해 주세요."
        }
    }

    /// 모든 검증 경로(직접 purchase 결과 / Transaction.updates listener)의 공용 처리.
    /// 백엔드 검증 성공 시 `transaction.finish()`를 호출해 큐에서 제거한다.
    private func handleVerification(
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
            errorMessage = "결제 확인에 실패했어요. 잠시 후 다시 시도해 주세요."
            Haptic.play(.error)
        }
    }

    /// "복원" 버튼 — Consumable이라 실제 복원은 없지만 App Store 가이드상 화면에 노출해야 한다.
    /// AppStore.sync()로 unfinished transaction을 다시 전달받게 한다.
    func restore() async {
        do {
            try await AppStore.sync()
        } catch {
            errorMessage = "복원 처리 중 문제가 발생했어요."
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
