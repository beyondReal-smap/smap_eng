import Foundation
import Observation

@Observable
@MainActor
final class ProfileViewModel {
    var profiles: [Profile] = []
    var isLoading: Bool = false
    var error: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: ProfilesResponse = try await APIClient.shared.send(
                Endpoint(path: "/api/profiles", method: .get)
            )
            self.profiles = response.profiles
            self.error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    func create(name: String) async {
        guard !name.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        do {
            let response: ProfileResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/profiles",
                    method: .post,
                    body: CreateProfileRequest(name: name)
                )
            )
            self.profiles.append(response.profile)
            self.error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct ProfilesResponse: Decodable {
    let profiles: [Profile]
}

private struct ProfileResponse: Decodable {
    let profile: Profile
}

private struct CreateProfileRequest: Encodable {
    let name: String
}
