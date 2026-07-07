import SwiftUI

/// 책 생성 진행 중 표시 + 결과 도착 시 onCreated 콜백.
struct GeneratingStep: View {
    @Bindable var viewModel: CreateBookViewModel
    let onCreated: (Book) -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            if let error = viewModel.generationError {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 56))
                    .foregroundStyle(Color.smapDanger)
                Text("동화 생성에 실패했어요")
                    .font(.smapHeading)
                    .foregroundStyle(Color.smapText)
                Text(error)
                    .font(.smapBody)
                    .foregroundStyle(Color.smapMuted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
                PrimaryButton(title: "다시 시도", variant: .filled) {
                    Task { await viewModel.generate() }
                }
                .padding(.horizontal, 40)
            } else {
                ZStack {
                    Circle()
                        .fill(Color.smapPrimarySoft)
                        .frame(width: 120, height: 120)
                    ProgressView()
                        .controlSize(.large)
                        .tint(Color.smapPrimary)
                }
                Text("동화를 만들고 있어요…")
                    .font(.smapHeading)
                    .foregroundStyle(Color.smapText)
                Text("이야기를 짓는 데 30초 ~ 2분 정도 걸려요.\n잠시만 기다려 주세요.")
                    .font(.smapBody)
                    .foregroundStyle(Color.smapMuted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            Spacer()
        }
    }
}
