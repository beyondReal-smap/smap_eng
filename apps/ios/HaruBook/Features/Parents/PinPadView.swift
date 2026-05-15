import SwiftUI

/// 4자리 숫자 PIN 입력 컨트롤.
/// 숨겨진 `TextField` + 4개의 시각적 셀로 구성. 셀을 탭하면 키보드가 올라온다.
struct PinPadView: View {
    @Binding var value: String
    /// 4자리 완성 시 호출. 부모는 검증을 트리거.
    var onComplete: ((String) -> Void)?
    /// 잘못된 PIN 등으로 흔들기 애니메이션을 줄 때 토큰 증가.
    var shakeToken: Int = 0

    @FocusState private var focused: Bool
    @State private var shakeOffset: CGFloat = 0

    private let length = 4

    var body: some View {
        ZStack {
            // 화면에서는 보이지 않지만 실제 입력은 여기서 받는다.
            TextField("", text: $value)
                .focused($focused)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .opacity(0)
                .frame(width: 1, height: 1)
                .onChange(of: value) { _, newValue in
                    // 숫자만 남기고 4자리로 자름.
                    let digits = newValue.filter(\.isNumber)
                    let trimmed = String(digits.prefix(length))
                    if trimmed != newValue { value = trimmed }
                    if trimmed.count == length {
                        onComplete?(trimmed)
                    }
                }

            HStack(spacing: 14) {
                ForEach(0..<length, id: \.self) { idx in
                    cell(index: idx)
                }
            }
            .offset(x: shakeOffset)
            .onTapGesture { focused = true }
        }
        .onChange(of: shakeToken) { _, _ in
            shake()
        }
        .onAppear { focused = true }
    }

    private func cell(index: Int) -> some View {
        let filled = index < value.count
        let isActive = index == value.count
        return ZStack {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.smapSurface)
                .frame(width: 56, height: 64)
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(
                            isActive ? Color.smapPrimary : Color.smapBorder,
                            lineWidth: isActive ? 2 : 1,
                        ),
                )

            if filled {
                Circle()
                    .fill(Color.smapPrimary)
                    .frame(width: 16, height: 16)
            }
        }
    }

    private func shake() {
        let damping: [(CGFloat, Double)] = [
            (-12, 0.05),
            (12, 0.05),
            (-8, 0.05),
            (8, 0.05),
            (-4, 0.05),
            (0, 0.05),
        ]
        Task { @MainActor in
            for (offset, duration) in damping {
                withAnimation(.linear(duration: duration)) {
                    shakeOffset = offset
                }
                try? await Task.sleep(nanoseconds: UInt64(duration * 1_000_000_000))
            }
        }
    }
}
