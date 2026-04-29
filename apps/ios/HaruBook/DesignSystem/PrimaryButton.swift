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
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if let icon, !isLoading {
                    icon
                }
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(foreground)
                }
                Text(title)
                    .font(.smapBodyEmphasis)
            }
            .frame(maxWidth: .infinity, minHeight: 52)
            .padding(.horizontal, 18)
            .background(background)
            .foregroundStyle(foreground)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(borderColor, lineWidth: variant == .outline ? 1.5 : 0)
            )
            .opacity(isEnabled ? 1 : 0.5)
        }
        .disabled(!isEnabled || isLoading)
        .buttonStyle(.plain)
    }

    private var background: Color {
        switch variant {
        case .filled: return .smapPrimary
        case .tonal: return .smapPrimarySoft
        case .outline: return .clear
        }
    }

    private var foreground: Color {
        switch variant {
        case .filled: return .white
        case .tonal, .outline: return .smapPrimary
        }
    }

    private var borderColor: Color {
        switch variant {
        case .outline: return .smapPrimary
        case .filled, .tonal: return .clear
        }
    }
}
