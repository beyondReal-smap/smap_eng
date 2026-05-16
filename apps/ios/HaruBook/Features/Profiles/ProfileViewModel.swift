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

    /// 프로필 생성 — name + age 필수, avatar 선택. 서버 zod schema는 age 5~10 필수, avatar는 10자 이하 optional.
    func create(name: String, age: Int, avatar: String? = nil) async {
        guard !name.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        do {
            let response: ProfileResponse = try await APIClient.shared.send(
                Endpoint(
                    path: "/api/profiles",
                    method: .post,
                    body: CreateProfileRequest(name: name, age: age, avatar: avatar)
                )
            )
            self.profiles.append(response.profile)
            self.error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// 프로필 soft delete — 서버는 deleted_at만 채우고 책/학습기록은 보존.
    /// 옵티미스틱: 즉시 로컬에서 제거 → 실패 시 다시 로드해 동기화.
    func delete(profile: Profile) async {
        let removed = profile
        self.profiles.removeAll { $0.id == profile.id }
        do {
            let _: DeleteProfileResponse = try await APIClient.shared.send(
                Endpoint(path: "/api/profiles/\(profile.id)", method: .delete),
            )
            self.error = nil
        } catch {
            // 실패 시 원상 복귀 — 서버와 일관성 회복.
            self.profiles.append(removed)
            self.profiles.sort { $0.id < $1.id }
            self.error = "프로필 삭제에 실패했어요."
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
    let age: Int
    let avatar: String?
}

private struct DeleteProfileResponse: Decodable {
    let profile: Profile
}
