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
                VStack(spacing: 20) {
                    hero

                    if viewModel.isLoading && viewModel.products.isEmpty {
                        ProgressView()
                            .tint(Color.smapPrimary)
                            .frame(maxWidth: .infinity, minHeight: 160)
                    } else if viewModel.products.isEmpty {
                        emptyError
                    } else {
                        ForEach(viewModel.products, id: \.id) { product in
                            productCard(product)
                        }
                    }

                    if let message = viewModel.errorMessage {
                        Text(message)
                            .font(.smapBody)
                            .foregroundStyle(Color.smapDanger)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 8)
                    }

                    restoreSection
                        .padding(.top, 8)
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

    // MARK: - Hero

    /// 화면 상단의 큰 별 + 한 줄 슬로건 — 어린이 가족 서비스 톤. 단순 텍스트 헤더보다 시각 임팩트.
    private var hero: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.smapPrimarySoft)
                    .frame(width: 96, height: 96)
                Image(systemName: "star.fill")
                    .font(.system(size: 44, weight: .bold))
                    .foregroundStyle(Color.smapWarn)
                    .shadow(color: Color.smapWarn.opacity(0.35), radius: 8, x: 0, y: 4)
            }
            VStack(spacing: 4) {
                Text("별로 새 동화를 만들어요")
                    .font(Font.atozBlack(22))
                    .foregroundStyle(Color.smapText)
                Text("별 한 개 = 새 동화 한 권")
                    .font(Font.atozRegular(14))
                    .foregroundStyle(Color.smapMuted)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 4)
        .padding(.bottom, 4)
    }

    // MARK: - Product Card

    private func productCard(_ product: Product) -> some View {
        let meta = StarPack.from(productId: product.id)
        let isPurchasing = viewModel.purchasingProductId == product.id
        let isHighlighted = meta?.isPopular == true

        // 카드 본문 — 메인 행의 갯수("별 60개") ↔ 금액("₩5,500")이 .firstTextBaseline으로 같은 라인 정렬.
        let card = VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(isHighlighted ? Color.smapPrimary.opacity(0.18) : Color.smapPrimarySoft)
                        .frame(width: 56, height: 56)
                    Image(systemName: "star.fill")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(Color.smapWarn)
                }
                .alignmentGuide(.firstTextBaseline) { _ in 36 }

                VStack(alignment: .leading, spacing: 4) {
                    Text(meta?.title ?? product.displayName)
                        .font(Font.atozBlack(20))
                        .foregroundStyle(Color.smapText)
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                    if let stars = meta?.stars {
                        Text("동화 \(stars)권 분량")
                            .font(Font.atozRegular(13))
                            .foregroundStyle(Color.smapMuted)
                    }
                }

                Spacer(minLength: 4)

                VStack(alignment: .trailing, spacing: 2) {
                    Text(product.displayPrice)
                        .font(Font.atozBlack(20))
                        .foregroundStyle(Color.smapText)
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                    if let perStar = meta?.perStarLabel(displayPrice: product.displayPrice) {
                        Text(perStar)
                            .font(Font.atozRegular(11))
                            .foregroundStyle(Color.smapMuted)
                    }
                }
            }

            // 추천 묶음만 filled 강조, 나머지는 tonal로 한 단계 낮춤.
            PrimaryButton(
                title: isPurchasing ? "결제 중…" : "구매하기",
                variant: isHighlighted ? .filled : .tonal,
                isLoading: isPurchasing,
                isEnabled: viewModel.purchasingProductId == nil,
            ) {
                Task { await viewModel.purchase(product) }
            }
        }
        .padding(18)
        .background(
            isHighlighted ? Color.smapPrimarySoft.opacity(0.5) : Color.smapSurface,
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(
                    isHighlighted ? Color.smapPrimary.opacity(0.45) : Color.smapBorder,
                    lineWidth: isHighlighted ? 1.5 : 1,
                ),
        )
        .shadow(
            color: isHighlighted ? Color.smapPrimary.opacity(0.12) : .clear,
            radius: isHighlighted ? 10 : 0,
            x: 0,
            y: 4,
        )

        // 배지를 카드 외곽 우상단에 ribbon으로 띄움 — 카드 내부 정렬에 영향 주지 않으면서 가격/금액 옆에 위치.
        return ZStack(alignment: .topTrailing) {
            card
            if let badge = meta?.badgeLabel {
                Text(badge)
                    .font(Font.atozBold(11))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.smapPrimary, in: Capsule())
                    .shadow(color: Color.smapPrimary.opacity(0.25), radius: 4, x: 0, y: 2)
                    .offset(x: -16, y: -10)
            }
        }
        .padding(.top, 10) // ribbon 만큼 카드 위쪽 여백 확보 — 다른 콘텐츠와 겹치지 않게.
    }

    // MARK: - Footer

    private var restoreSection: some View {
        VStack(alignment: .center, spacing: 6) {
            Button {
                Task { await viewModel.restore() }
            } label: {
                Label("구매 복원", systemImage: "arrow.clockwise")
                    .font(Font.atozBold(14))
                    .foregroundStyle(Color.smapPrimary)
            }
            .buttonStyle(.plain)
            Text("기기 변경·재설치 후 미반영된 거래가 있다면 여기를 탭하세요.")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }

    private var policySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "info.circle.fill")
                    .font(.system(size: 12, weight: .bold))
                Text("결제 안내")
                    .font(Font.atozBold(13))
            }
            .foregroundStyle(Color.smapMuted)

            Text(
                "결제는 Apple App Store를 통해 안전하게 처리되며 영수증은 Apple ID 이메일로 발송됩니다. 별은 사용한 후에는 환불이 어려울 수 있고, 환불은 ‘설정 → Apple ID → 미디어 및 구매 → 구매 기록’에서 신청합니다.",
            )
            .font(.smapCaption)
            .foregroundStyle(Color.smapMuted)
            .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color.smapMutedBg, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
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

// MARK: - StarPack metadata

/// IAP product ID → 별 개수 / 추천 배지 / 단가 메타데이터.
/// 서버 `src/lib/iap/products.ts`와 동기 유지.
private struct StarPack {
    let stars: Int
    let title: String
    let badgeLabel: String?
    let isPopular: Bool

    static func from(productId: String) -> StarPack? {
        switch productId {
        case "com.smap.harubook.star_small":
            return StarPack(stars: 10, title: "별 10개", badgeLabel: nil, isPopular: false)
        case "com.smap.harubook.star_medium":
            return StarPack(stars: 60, title: "별 60개", badgeLabel: "가장 인기", isPopular: true)
        case "com.smap.harubook.star_large":
            return StarPack(stars: 130, title: "별 130개", badgeLabel: "가장 알뜰", isPopular: false)
        default:
            return nil
        }
    }

    /// "별 1개당 ~원" — displayPrice에서 숫자만 추출해 단가 계산. 통화 기호/콤마 제거.
    func perStarLabel(displayPrice: String) -> String? {
        let digits = displayPrice.unicodeScalars.filter { CharacterSet.decimalDigits.contains($0) }
        let digitString = String(String.UnicodeScalarView(digits))
        guard let total = Int(digitString), stars > 0 else {
            return nil
        }
        let perStar = Int((Double(total) / Double(stars)).rounded())
        return "별 1개당 약 \(perStar)원"
    }
}
