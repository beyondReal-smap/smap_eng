import Foundation
import Security

enum KeychainError: Error {
    case status(OSStatus)
    case unexpectedData
}

struct KeychainStore {
    let service: String

    init(service: String = Bundle.main.bundleIdentifier ?? "com.smap.harubook") {
        self.service = service
    }

    func save(_ data: Data, for key: String) throws {
        let baseQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(baseQuery as CFDictionary)

        var attributes = baseQuery
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.status(status) }
    }

    func load(for key: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw KeychainError.status(status) }
        guard let data = item as? Data else { throw KeychainError.unexpectedData }
        return data
    }

    func delete(for key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.status(status)
        }
    }

    func saveString(_ value: String, for key: String) throws {
        try save(Data(value.utf8), for: key)
    }

    func loadString(for key: String) throws -> String? {
        guard let data = try load(for: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func saveCodable<T: Encodable>(_ value: T, for key: String) throws {
        let data = try JSONEncoder().encode(value)
        try save(data, for: key)
    }

    func loadCodable<T: Decodable>(_ type: T.Type, for key: String) throws -> T? {
        guard let data = try load(for: key) else { return nil }
        return try JSONDecoder().decode(type, from: data)
    }
}
