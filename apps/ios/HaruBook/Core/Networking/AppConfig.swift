import Foundation

/// `Resources/Config.plist`에서 환경 설정을 읽는 단순 컨테이너.
///
/// 환경별 분기(staging/production)는 추후 build configuration + xcconfig로 확장 예정.
enum AppConfig {
    static let apiBaseURL: URL = {
        guard let raw = string(for: "API_BASE_URL"), let url = URL(string: raw) else {
            preconditionFailure("API_BASE_URL is missing in Config.plist")
        }
        return url
    }()

    static let authCallbackScheme: String = string(for: "AUTH_CALLBACK_SCHEME") ?? "smapeng"
    static let authCallbackHost: String = string(for: "AUTH_CALLBACK_HOST") ?? "auth"
    static let authCallbackPath: String = string(for: "AUTH_CALLBACK_PATH") ?? "/callback"

    static var authCallbackURL: URL {
        var components = URLComponents()
        components.scheme = authCallbackScheme
        components.host = authCallbackHost
        components.path = authCallbackPath
        guard let url = components.url else {
            preconditionFailure("Failed to build auth callback URL from Config.plist")
        }
        return url
    }

    private static func string(for key: String) -> String? {
        if let value = Bundle.main.object(forInfoDictionaryKey: key) as? String, !value.isEmpty {
            return value
        }
        return configPlist[key] as? String
    }

    // Bundle 리소스에서 한 번 로드되고 이후 read-only이므로 동시성 안전성 검사를 명시적으로 끈다.
    nonisolated(unsafe) private static let configPlist: [String: Any] = {
        guard let url = Bundle.main.url(forResource: "Config", withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let plist = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any]
        else {
            return [:]
        }
        return plist
    }()
}
