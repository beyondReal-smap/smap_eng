import SwiftUI
import StoreKit

/// 별 충전(IAP) 화면.
///
/// App Store Review Guideline 3.1.1 — 디지털 콘텐츠는 IAP만. 토스 결제 페이지 링크 금지.
/// 3.1.1(c) — Consumable에도 "구매 복원" 버튼이 화면에 있어야 함.
struct StoreView: View {
    @State private var viewModel = StoreViewModel()

    /// 충전 성공 시 상위로 알림(잔액 새로고침 트리거).
    var onGranted: ((Int) -> Void)?

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header

                    if viewModel.isLoading && viewModel.products.isEmpty {
                        ProgressView()
                            .tint(Color.smapPrimary)
                            .frame(maxWidth: .infinity, minHeight: 120)
                    } else if viewModel.products.isEmpty {
                        emptyError
                    } else {
                        ForEach(viewModel.products, id: \.id) { product in
                            productCard(product)
                        }
                    }

                    if let message = viewModel.errorMessage {
                        Text(message)
                            .font(.smapCaption)
                            .foregroundStyle(Color.smapDanger)
                    }

                    Divider().padding(.vertical, 8)

                    restoreSection
                    policySection
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 24)
            }
        }
        .navigationTitle("별 충전")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load() }
        .onChange(of: viewModel.lastGrantedStars) { _, stars in
            if let stars { onGranted?(stars) }
        }
    }

    // MARK: - Sections

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("별 한 개로 동화 한 권을 만들어요")
                .font(.smapHeading)
                .foregroundStyle(Color.smapText)
            Text("결제는 Apple을 통해 안전하게 이루어지며, 영수증은 Apple ID 이메일로 발송됩니다.")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func productCard(_ product: Product) -> some View {
        let isPurchasing = viewModel.purchasingProductId == product.id
        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(product.displayName)
                    .font(.smapBodyEmphasis)
                    .foregroundStyle(Color.smapText)
                Spacer()
                Text(product.displayPrice)
                    .font(.smapHeading)
                    .foregroundStyle(Color.smapPrimary)
            }

            Text(product.description)
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
                .fixedSize(horizontal: false, vertical: true)

            PrimaryButton(
                title: isPurchasing ? "결제 중…" : "구매하기",
                variant: .filled,
                isLoading: isPurchasing,
                isEnabled: viewModel.purchasingProductId == nil,
            ) {
                Task { await viewModel.purchase(product) }
            }
        }
        .padding(18)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1),
        )
    }

    private var restoreSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button {
                Task { await viewModel.restore() }
            } label: {
                Text("구매 복원")
                    .font(.smapBodyEmphasis)
                    .foregroundStyle(Color.smapPrimary)
            }
            .buttonStyle(.plain)
            Text("기기 변경·재설치 후 미반영된 거래가 있다면 여기를 탭하세요.")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
        }
    }

    private var policySection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("환불 정책")
                .font(.smapBodyEmphasis)
                .foregroundStyle(Color.smapText)
            Text(
                "별은 Consumable 상품으로, 사용한 후에는 환불이 어려울 수 있습니다. 환불은 Apple의 정책에 따르며, ‘설정 → Apple ID → 미디어 및 구매 → 구매 기록’ 화면에서 신청할 수 있습니다.",
            )
            .font(.smapCaption)
            .foregroundStyle(Color.smapMuted)
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var emptyError: some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 40))
                .foregroundStyle(Color.smapMuted)
            Text("상품 정보를 불러올 수 없어요")
                .font(.smapBody)
                .foregroundStyle(Color.smapText)
            PrimaryButton(title: "다시 불러오기", variant: .tonal) {
                Task { await viewModel.load() }
            }
            .frame(maxWidth: 220)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }
}
