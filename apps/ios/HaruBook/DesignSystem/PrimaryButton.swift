import SwiftUI

struct PrimaryButton: View {
    enum Variant {
        case filled
        case tonal
        case outline
    }

    let title: String
    var icon: Image?
    var variant: Variant = .filled
    var isLoading: Bool = false
    var isEnabled: Bool = true
    /// 명시되면 variant 기본 배경 대신 사용. 카카오/구글 같은 외부 브랜드 색 적용 시.
    var backgroundOverride: Color?
    /// 명시되면 variant 기본 전경(텍스트/아이콘) 대신 사용.
    var foregroundOverride: Color?
    /// 명시되면 1.5pt 외곽선을 그린다. variant=.outline의 smapPrimary 외곽선보다 우선.
    var borderOverride: Color?
    /// 명시되면 icon만 다른 색으로 렌더 (예: 구글 G를 Google 블루로).
    var iconColorOverride: Color?
    /// 명시되면 라벨 폰트를 변경 (예: 로그인 버튼 A2Z 손글씨).
    var fontOverride: Font?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if let icon, !isLoading {
                    icon
                        .resizable()
                        .scaledToFit()
                        .frame(width: 20, height: 20)
                        .foregroundStyle(iconColorOverride ?? foreground)
                }
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(foreground)
                }
                Text(title)
                    .font(fontOverride ?? Font.smapBodyEmphasis)
            }
            .frame(maxWidth: .infinity, minHeight: 52)
            .padding(.horizontal, 18)
            .background(background)
            .foregroundStyle(foreground)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(borderColor, lineWidth: hasBorder ? 1.5 : 0)
            )
            .opacity(isEnabled ? 1 : 0.5)
        }
        .disabled(!isEnabled || isLoading)
        .buttonStyle(.plain)
    }

    private var background: Color {
        if let backgroundOverride { return backgroundOverride }
        switch variant {
        case .filled: return .smapPrimary
        case .tonal: return .smapPrimarySoft
        case .outline: return .clear
        }
    }

    private var foreground: Color {
        if let foregroundOverride { return foregroundOverride }
        switch variant {
        case .filled:
            // Soft Coral Peach fill(#FFB39A) 위 deep coral ink — 라이트/다크 모두 대비 충분.
            return .smapPrimaryForeground
        case .tonal, .outline:
            // tonal: 파스텔/어두운 코랄 bg, outline: 투명(페이지 배경) bg.
            // primaryForeground(deep ink) 는 다크에서 어두운 코랄/배경과 명도 차이가 거의 없어 안 보임.
            // smapOnPrimarySoft는 라이트에서는 deep ink, 다크에서는 밝은 코랄로 양쪽 가독성 확보.
            return .smapOnPrimarySoft
        }
    }

    private var borderColor: Color {
        if let borderOverride { return borderOverride }
        switch variant {
        case .outline: return .smapPrimary
        case .filled, .tonal: return .clear
        }
    }

    private var hasBorder: Bool {
        if borderOverride != nil { return true }
        return variant == .outline
    }
}
