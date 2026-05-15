import SwiftUI
import WebKit

/// `WKWebView`를 SwiftUI에 임베드하는 단순 래퍼.
/// 로딩 완료/실패 신호를 부모에 통지해 폴백 UI를 표시할 수 있게 한다.
///
/// 외부 링크 차단: 모든 navigation은 초기 URL 호스트와 동일해야 한다(약관 본문 안의
/// 외부 링크 클릭이 인앱 WebView에서 열리지 않도록 — Safari로 분기시키지 않고 그냥 차단).
struct WebDocumentView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    @Binding var loadFailed: Bool

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self, allowedHost: url.host ?? "")
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // 단방향. URL 변경은 부모가 새 인스턴스를 만들어 처리.
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        let parent: WebDocumentView
        let allowedHost: String

        init(parent: WebDocumentView, allowedHost: String) {
            self.parent = parent
            self.allowedHost = allowedHost
        }

        // iOS 16+/Xcode 14+ 에서 WKNavigationDelegate optional 요구사항의 decisionHandler가
        // `@MainActor` isolation으로 선언되어, 일반 closure 시그니처와 "거의 일치"하지만
        // 정확히 일치하지 않는다는 경고가 나온다. 동일하게 @MainActor 어노테이션 추가.
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void,
        ) {
            // 같은 호스트의 페이지만 인앱에서 표시. 외부 URL은 차단(Safari로 분기시키지도 않음 —
            // App Store 정책상 약관 페이지에서 외부 결제/충전 페이지로 점프하지 않도록 보수적 처리).
            if let target = navigationAction.request.url?.host, target == allowedHost {
                decisionHandler(.allow)
            } else {
                decisionHandler(.cancel)
            }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = true
                self.parent.loadFailed = false
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
                self.parent.loadFailed = false
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
                self.parent.loadFailed = true
            }
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error,
        ) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
                self.parent.loadFailed = true
            }
        }
    }
}
