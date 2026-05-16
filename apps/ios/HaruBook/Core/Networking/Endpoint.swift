import Foundation

struct Endpoint<Response: Decodable> {
    enum Method: String {
        case get = "GET"
        case post = "POST"
        case patch = "PATCH"
        case put = "PUT"
        case delete = "DELETE"
    }

    let path: String
    let method: Method
    let query: [URLQueryItem]
    let body: (any Encodable)?
    let requiresAuth: Bool
    /// 요청 timeout(초). 기본 60s. LLM 책 생성처럼 1~2분 걸리는 호출은 더 길게(예: 180s) 지정.
    let timeout: TimeInterval

    init(
        path: String,
        method: Method = .get,
        query: [URLQueryItem] = [],
        body: (any Encodable)? = nil,
        requiresAuth: Bool = true,
        timeout: TimeInterval = 60
    ) {
        self.path = path
        self.method = method
        self.query = query
        self.body = body
        self.requiresAuth = requiresAuth
        self.timeout = timeout
    }
}

/// 응답 본문이 없거나 무시 가능한 엔드포인트용.
struct EmptyResponse: Decodable {}
