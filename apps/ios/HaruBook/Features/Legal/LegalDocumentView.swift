import SwiftUI

/// 약관/처리방침/환불정책/사업자정보 공용 컨테이너.
/// 운영 페이지를 인앱 WebView로 표시하고 로딩/실패 상태를 처리한다.
struct LegalDocumentView: View {
    let document: LegalDocument

    @State private var isLoading: Bool = true
    @State private var loadFailed: Bool = false
    @State private var reloadToken: Int = 0

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            if loadFailed {
                fallback
            } else {
                WebDocumentView(
                    url: document.url(),
                    isLoading: $isLoading,
                    loadFailed: $loadFailed,
                )
                .id(reloadToken)
            }

            if isLoading && !loadFailed {
                ProgressView()
                    .controlSize(.large)
                    .tint(.smapPrimary)
            }
        }
        .navigationTitle(document.title)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var fallback: some View {
        VStack(spacing: 24) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 56))
                .foregroundStyle(Color.smapMuted)

            VStack(spacing: 8) {
                Text(document.fallbackHeadline)
                    .font(.smapHeading)
                    .foregroundStyle(Color.smapText)
                Text("네트워크 연결을 확인하고 다시 시도해 주세요.")
                    .font(.smapBody)
                    .foregroundStyle(Color.smapMuted)
                    .multilineTextAlignment(.center)
            }

            PrimaryButton(title: "다시 불러오기", variant: .filled) {
                reloadToken += 1
                loadFailed = false
                isLoading = true
            }
            .frame(maxWidth: 280)
        }
        .padding(.horizontal, 32)
    }
}
