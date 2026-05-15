import SwiftUI

/// 설정 화면. 계정 / 약관 / 앱 정보 / 위험 영역 4개 섹션으로 구성한다.
struct SettingsView: View {
    @Environment(AuthState.self) private var auth
    @Environment(\.dismiss) private var dismiss

    /// 부모(HomeRouter)에서 프로필 선택 상태 초기화를 위해 콜백 주입.
    var onSwitchProfile: () -> Void
    var onSignOut: () -> Void

    @State private var showDeleteSheet: Bool = false

    var body: some View {
        List {
            accountSection
            storeSection
            parentsSection
            legalSection
            appInfoSection
            dangerSection
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Color.smapBackground.ignoresSafeArea())
        .navigationTitle("설정")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showDeleteSheet) {
            NavigationStack {
                DeleteAccountView(onCompleted: {
                    showDeleteSheet = false
                    onSignOut()
                })
            }
        }
    }

    // MARK: - 계정

    private var accountSection: some View {
        Section("계정") {
            Button {
                onSwitchProfile()
                dismiss()
            } label: {
                Label("프로필 전환", systemImage: "person.crop.circle.badge.questionmark")
                    .foregroundStyle(Color.smapText)
            }

            Button(role: .destructive) {
                auth.signOut()
                onSignOut()
            } label: {
                Label("로그아웃", systemImage: "rectangle.portrait.and.arrow.right")
            }
        }
    }

    // MARK: - 별 충전 (IAP)

    private var storeSection: some View {
        Section {
            NavigationLink {
                StoreView()
            } label: {
                Label("별 충전", systemImage: "sparkles")
                    .foregroundStyle(Color.smapText)
            }
        } footer: {
            Text("결제는 Apple App Store를 통해 안전하게 처리됩니다.")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
        }
    }

    // MARK: - 보호자 모드

    private var parentsSection: some View {
        Section {
            NavigationLink {
                ParentalPinGateView()
            } label: {
                Label("보호자 모드 · 주간 리포트", systemImage: "person.2.fill")
                    .foregroundStyle(Color.smapText)
            }
        } footer: {
            Text("PIN으로 잠긴 보호자 전용 영역입니다. 30분 후 자동 잠금됩니다.")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
        }
    }

    // MARK: - 법적 정보

    private var legalSection: some View {
        Section("법적 정보") {
            ForEach(LegalDocument.allCases) { doc in
                NavigationLink {
                    LegalDocumentView(document: doc)
                } label: {
                    Text(doc.title)
                        .foregroundStyle(Color.smapText)
                }
            }
        }
    }

    // MARK: - 앱 정보

    private var appInfoSection: some View {
        Section("앱 정보") {
            row(title: "서비스", value: BusinessInfo.serviceName)
            row(title: "운영자", value: BusinessInfo.companyName)
            row(title: "버전", value: appVersion)
            Link(destination: URL(string: "mailto:\(BusinessInfo.email)")!) {
                row(title: "고객 문의", value: BusinessInfo.email)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - 위험 영역

    private var dangerSection: some View {
        Section {
            Button(role: .destructive) {
                showDeleteSheet = true
            } label: {
                Label("계정 삭제", systemImage: "trash")
            }
        } footer: {
            Text("계정을 삭제하면 모든 책·학습 기록·결제 이력이 영구적으로 사라지며 복구할 수 없습니다.")
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
        }
    }

    // MARK: - Helpers

    private func row(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .foregroundStyle(Color.smapText)
            Spacer()
            Text(value)
                .foregroundStyle(Color.smapMuted)
                .multilineTextAlignment(.trailing)
        }
    }

    private var appVersion: String {
        let info = Bundle.main.infoDictionary
        let short = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(short) (\(build))"
    }
}
