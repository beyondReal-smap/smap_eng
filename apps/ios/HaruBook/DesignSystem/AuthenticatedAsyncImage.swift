import SwiftUI
import UIKit

/// `/api/static/images/...` 처럼 Bearer 토큰이 필요한 미디어를 다운로드해서 표시한다.
/// SwiftUI 기본 `AsyncImage`는 헤더 주입을 지원하지 않아 별도로 작성.
struct AuthenticatedAsyncImage<Placeholder: View, Failure: View>: View {
    let path: String
    @ViewBuilder let placeholder: () -> Placeholder
    @ViewBuilder let failure: () -> Failure

    @State private var image: UIImage?
    @State private var loadState: LoadState = .idle

    enum LoadState: Equatable {
        case idle
        case loading
        case success
        case failed
    }

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else if loadState == .failed {
                failure()
            } else {
                placeholder()
            }
        }
        .task(id: path) { await load() }
    }

    private func load() async {
        loadState = .loading
        defer {
            if image == nil, loadState != .failed { loadState = .failed }
        }

        let url = AppConfig.apiBaseURL.appendingPathComponent(path)
        var request = URLRequest(url: url)
        if let token = AuthState.shared.peekAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
                loadState = .failed
                return
            }
            if let ui = UIImage(data: data) {
                self.image = ui
                loadState = .success
            } else {
                loadState = .failed
            }
        } catch {
            loadState = .failed
        }
    }
}
