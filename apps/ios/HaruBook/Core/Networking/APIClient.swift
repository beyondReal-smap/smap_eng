import Foundation

/// 단일 백엔드(`AppConfig.apiBaseURL`)에 대한 JSON HTTP 클라이언트.
///
/// 백엔드는 요청·응답 모두 camelCase를 사용하므로 키 변환 전략은 적용하지 않는다.
/// 일부 RFC 7636/8628 호환 엔드포인트(`/api/auth/mobile/exchange` 등)에서는 모델 측에서
/// 명시적 `CodingKeys`로 snake_case 키를 매핑한다.
///
/// 401 응답 시 백엔드가 refresh를 제공하지 않으므로 즉시 로컬 세션을 정리한다.
actor APIClient {
    static let shared = APIClient()

    private let baseURL: URL
    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(baseURL: URL = AppConfig.apiBaseURL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session

        let encoder = JSONEncoder()
        // camelCase 유지. snake_case 키가 필요한 요청은 모델에서 CodingKeys로 직접 명시.
        encoder.keyEncodingStrategy = .useDefaultKeys
        self.encoder = encoder

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .useDefaultKeys
        self.decoder = decoder
    }

    func send<R: Decodable>(_ endpoint: Endpoint<R>) async throws -> R {
        var components = URLComponents(
            url: baseURL.appendingPathComponent(endpoint.path),
            resolvingAgainstBaseURL: false
        )
        if !endpoint.query.isEmpty {
            components?.queryItems = endpoint.query
        }
        guard let url = components?.url else { throw APIError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if endpoint.body != nil {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        if endpoint.requiresAuth {
            if let token = await MainActor.run(body: { AuthState.shared.peekAccessToken() }) {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
        }

        if let body = endpoint.body {
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch is CancellationError {
            throw APIError.canceled
        } catch let urlError as URLError where urlError.code == .cancelled {
            throw APIError.canceled
        } catch {
            throw APIError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }

        if http.statusCode == 401, endpoint.requiresAuth {
            // 백엔드는 refresh 토큰을 발급하지 않으므로 즉시 세션 정리.
            await MainActor.run { AuthState.shared.handleUnauthorized() }
            throw APIError.unauthorized
        }

        guard (200..<300).contains(http.statusCode) else {
            let body = try? JSONDecoder().decode(APIErrorBody.self, from: data)
            throw APIError.http(
                status: http.statusCode,
                code: body?.error,
                message: body?.message ?? body?.errorDescription
            )
        }

        if R.self == EmptyResponse.self {
            // swiftlint:disable:next force_cast
            return EmptyResponse() as! R
        }

        do {
            return try decoder.decode(R.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }
}

private struct APIErrorBody: Decodable {
    let error: String?
    let message: String?
    let errorDescription: String?

    enum CodingKeys: String, CodingKey {
        case error, message
        case errorDescription = "error_description"
    }
}

private struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void

    init(_ wrapped: any Encodable) {
        self._encode = wrapped.encode
    }

    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}
