import SwiftUI
import UIKit

/// 책장에서 같은 표지를 반복 렌더링할 때마다 네트워크를 두드리지 않도록 메모리 캐시.
/// URLCache.shared가 백그라운드로 캐시하긴 하지만, Authorization 헤더가 붙은 요청은
/// 캐시 키가 분리되어 hit율이 떨어진다. 디코딩된 UIImage를 직접 캐시해 빠른 렌더링 보장.
/// countLimit = 200장 (책장 표지/장면 합계 기준), totalCostLimit = 96 MiB (4K x 4K x 4B 약 64MiB 여유분).
@MainActor
private enum AuthenticatedImageCache {
    static let storage: NSCache<NSString, UIImage> = {
        let cache = NSCache<NSString, UIImage>()
        cache.countLimit = 200
        cache.totalCostLimit = 96 * 1024 * 1024
        return cache
    }()
}

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
        // 같은 path를 다시 보여줄 때 네트워크 왕복 생략 — 책장 스크롤 시 체감 속도 큰 차이.
        let cacheKey = path as NSString
        if let cached = AuthenticatedImageCache.storage.object(forKey: cacheKey) {
            self.image = cached
            self.loadState = .success
            return
        }

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
                // cost = byte 수. NSCache가 totalCostLimit 기반으로 LRU eviction.
                AuthenticatedImageCache.storage.setObject(ui, forKey: cacheKey, cost: data.count)
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
