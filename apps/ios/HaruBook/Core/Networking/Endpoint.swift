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

    init(
        path: String,
        method: Method = .get,
        query: [URLQueryItem] = [],
        body: (any Encodable)? = nil,
        requiresAuth: Bool = true
    ) {
        self.path = path
        self.method = method
        self.query = query
        self.body = body
        self.requiresAuth = requiresAuth
    }
}

/// 응답 본문이 없거나 무시 가능한 엔드포인트용.
struct EmptyResponse: Decodable {}
