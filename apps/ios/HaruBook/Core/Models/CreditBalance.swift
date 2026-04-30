import Foundation

/// `GET /api/billing/credits` 응답의 `credits` 필드.
///
/// 백엔드는 `credit_balances` row를 그대로 직렬화하므로 camelCase + 일부 필드는 응답에 없을 수 있다.
struct CreditBalance: Decodable, Equatable, Sendable {
    let balance: Int
    let totalPurchased: Int?
}

struct CreditsResponse: Decodable {
    let credits: CreditBalance
}
