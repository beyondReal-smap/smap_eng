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
            return "주소가 올바르지 않아 요청을 보낼 수 없어요."
        case .invalidResponse:
            return "서버 응답을 이해할 수 없어요. 잠시 후 다시 시도해 주세요."
        case .http(let status, let code, let message):
            return Self.humanMessage(status: status, code: code, message: message)
        case .decoding:
            return "정보를 불러오는 데 실패했어요. 잠시 후 다시 시도해 주세요."
        case .transport(let error):
            return Self.transportMessage(error)
        case .unauthorized:
            return "로그인이 만료되었어요. 다시 로그인해 주세요."
        case .canceled:
            return "요청이 취소되었어요."
        }
    }

    /// 서버 응답을 사용자 친화 문구로 매핑.
    /// 1) 백엔드가 알려준 `code`가 우리가 정의한 도메인 에러면 그것을 우선 사용.
    /// 2) 아니면 HTTP status 카테고리로 자연어 메시지를 만든다.
    ///
    /// 핵심 원칙: 사용자가 보는 메시지에는 HTTP 숫자/내부 식별자(`insufficient_credits` 같은
    /// snake_case 키)가 노출되지 않는다. 디버그 로깅에는 `case` 자체의 associated value가
    /// 보존되어 있으니 콘솔에서는 여전히 추적 가능.
    private static func humanMessage(status: Int, code: String?, message: String?) -> String {
        if let code, let mapped = domainMessage(for: code) {
            return mapped
        }
        // 백엔드가 사람이 읽을 만한 한글 message를 보내준 경우(예: validation 에러 상세) 그대로 사용.
        if let message, !message.isEmpty, !looksLikeInternalCode(message) {
            return message
        }
        switch status {
        case 400, 422:
            return "입력값을 다시 확인해 주세요."
        case 401:
            return "로그인이 만료되었어요. 다시 로그인해 주세요."
        case 402:
            return "별이 부족해요. 별을 충전한 뒤 다시 시도해 주세요."
        case 403:
            return "이 기능을 사용할 권한이 없어요."
        case 404:
            return "찾으시는 정보를 불러올 수 없어요."
        case 409:
            return "이미 처리된 요청이에요."
        case 429:
            return "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요."
        case 502, 503, 504:
            return "지금 서버 연결이 어려워요. 잠시 후 다시 시도해 주세요."
        case 500..<600:
            return "서버가 잠시 불안정해요. 잠시 후 다시 시도해 주세요."
        default:
            return "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요."
        }
    }

    /// 백엔드 응답의 `error` 필드(`{ "error": "insufficient_credits", ... }`)를 한글 메시지로.
    /// 미등록 키는 nil 반환 → humanMessage가 HTTP status 폴백을 적용한다.
    private static func domainMessage(for code: String) -> String? {
        switch code {
        case "insufficient_credits":
            return "별이 부족해요. 별을 충전한 뒤 다시 만들어 보세요."
        case "duplicate_email", "EMAIL_ALREADY_EXISTS":
            return "이미 가입된 이메일이에요."
        case "invalid_credentials", "INVALID_CREDENTIALS":
            return "이메일 또는 비밀번호가 맞지 않아요."
        case "weak_password":
            return "비밀번호는 영문과 숫자를 포함해 8자 이상이어야 해요."
        case "rate_limited":
            return "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요."
        case "profile_not_found":
            return "프로필을 찾을 수 없어요."
        case "book_not_found":
            return "이 책을 불러올 수 없어요."
        case "passage_not_found":
            return "이 문장을 불러올 수 없어요."
        case "quiz_not_ready":
            return "퀴즈가 아직 준비되지 않았어요."
        case "tts_failed":
            return "음성을 만들지 못했어요. 잠시 후 다시 시도해 주세요."
        case "image_failed":
            return "삽화를 만들지 못했어요. 잠시 후 다시 시도해 주세요."
        case "llm_failed", "generation_failed":
            return "동화를 만들지 못했어요. 잠시 후 다시 시도해 주세요."
        case "validation_error":
            return "입력값을 다시 확인해 주세요."
        case "forbidden":
            return "이 기능을 사용할 권한이 없어요."
        default:
            return nil
        }
    }

    /// snake_case 식별자나 `Error ###` 같은 내부 문자열은 사용자에게 노출하지 않는다.
    private static func looksLikeInternalCode(_ s: String) -> Bool {
        // 영문 소문자 + 언더스코어로만 이루어진 짧은 문자열은 백엔드 식별자일 가능성이 높다.
        let snake = s.range(of: "^[a-z_]+$", options: .regularExpression) != nil
        let looksLikeStackTrace = s.contains("Error Domain=") || s.hasPrefix("NSURL")
        return snake || looksLikeStackTrace
    }

    /// URLError → "인터넷이 끊겼어요 / 시간이 초과됐어요" 같은 자연어. 그 외에는 일반 폴백.
    private static func transportMessage(_ error: Error) -> String {
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet, .networkConnectionLost:
                return "인터넷 연결을 확인하고 다시 시도해 주세요."
            case .timedOut:
                return "응답이 너무 늦어요. 잠시 후 다시 시도해 주세요."
            case .cannotFindHost, .cannotConnectToHost, .dnsLookupFailed:
                return "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요."
            default:
                return "네트워크가 불안정해요. 잠시 후 다시 시도해 주세요."
            }
        }
        return "네트워크가 불안정해요. 잠시 후 다시 시도해 주세요."
    }
}
