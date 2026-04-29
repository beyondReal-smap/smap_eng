import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case http(status: Int, code: String?, message: String?)
    case decoding(Error)
    case transport(Error)
    case unauthorized
    case canceled

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "잘못된 URL입니다."
        case .invalidResponse:
            return "서버 응답을 해석할 수 없습니다."
        case .http(let status, let code, let message):
            let detail = [code, message].compactMap { $0 }.joined(separator: " · ")
            return "요청 실패 (HTTP \(status))\(detail.isEmpty ? "" : " — \(detail)")"
        case .decoding(let error):
            return "응답 파싱에 실패했습니다: \(error.localizedDescription)"
        case .transport(let error):
            return "네트워크 오류: \(error.localizedDescription)"
        case .unauthorized:
            return "로그인이 만료되었습니다. 다시 로그인해 주세요."
        case .canceled:
            return "요청이 취소되었습니다."
        }
    }
}
