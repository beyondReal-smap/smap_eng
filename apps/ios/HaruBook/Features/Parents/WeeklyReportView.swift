import SwiftUI

/// 보호자 주간 리포트 — PIN 통과 후 표시.
/// `onLock`은 "지금 잠그기" / 자동 잠금 만료 시 부모(`ParentalPinGateView`)에 신호.
struct WeeklyReportView: View {
    var onLock: () -> Void

    @State private var viewModel = WeeklyReportViewModel()
    @State private var pinStore = ParentalPinStore.shared

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    statusBar

                    if viewModel.isLoading && viewModel.reports.isEmpty {
                        ProgressView()
                            .tint(Color.smapPrimary)
                            .frame(maxWidth: .infinity, minHeight: 120)
                    } else if let error = viewModel.error, viewModel.reports.isEmpty {
                        // 데이터가 없는 자연스러운 상태(reports.isEmpty 아래)와 달리
                        // 진짜 통신 실패는 재시도 경로를 제공한다.
                        errorState(error)
                    } else if viewModel.reports.isEmpty {
                        emptyError("아직 모은 학습 데이터가 없어요.")
                    } else {
                        ForEach(viewModel.reports) { report in
                            ProfileReportCard(report: report)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 20)
            }
        }
        .task { await viewModel.load() }
    }

    private var statusBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "lock.open.fill")
                .foregroundStyle(Color.smapPrimary)
            Text("보호자 모드 · 30분 후 자동 잠금")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
            Spacer()
            Button {
                onLock()
            } label: {
                Text("지금 잠그기")
                    .font(.smapCaption)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.smapPrimarySoft)
                    .foregroundStyle(Color.smapPrimary)
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1),
        )
    }

    private func emptyError(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.system(size: 40))
                .foregroundStyle(Color.smapMuted)
            Text(message)
                .font(.smapBody)
                .foregroundStyle(Color.smapMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundStyle(Color.smapDanger)
            Text(message)
                .font(.smapBody)
                .foregroundStyle(Color.smapDanger)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
            PrimaryButton(title: "다시 시도", variant: .tonal) {
                Task { await viewModel.load() }
            }
            .padding(.horizontal, 24)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }
}
