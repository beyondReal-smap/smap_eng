import Foundation

/// 인앱 표시 대상 법적 문서. 운영 URL은 메인 앱의 `/legal/*` 라우트를 재사용한다.
///
/// App Store Review Guideline 2.3.7, 5.1.1 — 약관/처리방침을 외부 브라우저가 아닌
/// 앱 내에서 표시해야 한다. 본문은 빈번히 갱신되므로 Swift 상수로 옮기지 않고
/// WKWebView로 원격 페이지를 표시하되, 오프라인/장애 시 짧은 폴백 텍스트로 대체한다.
enum LegalDocument: String, CaseIterable, Identifiable {
    case terms
    case privacy
    case refund
    case business

    var id: String { rawValue }

    var title: String {
        switch self {
        case .terms:    return "이용약관"
        case .privacy:  return "개인정보처리방침"
        case .refund:   return "환불정책"
        case .business: return "사업자정보"
        }
    }

    /// 운영 URL — `apiBaseURL`은 같은 호스트의 메인 앱을 가리킨다.
    /// 랜딩 catch-all 프록시가 `/legal/*`를 메인 앱으로 그대로 forward.
    func url() -> URL {
        AppConfig.apiBaseURL.appendingPathComponent("legal/\(rawValue)")
    }

    /// 오프라인/장애 폴백. 본문 전체가 아닌 핵심 안내만 — 사용자는 네트워크 복구 후 재시도 가능.
    var fallbackHeadline: String {
        switch self {
        case .terms:    return "이용약관을 불러올 수 없어요"
        case .privacy:  return "개인정보처리방침을 불러올 수 없어요"
        case .refund:   return "환불정책을 불러올 수 없어요"
        case .business: return "사업자정보를 불러올 수 없어요"
        }
    }
}
