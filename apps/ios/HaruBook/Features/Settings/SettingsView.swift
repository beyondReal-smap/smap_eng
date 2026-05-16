import SwiftUI
import UserNotifications
import UIKit

/// 설정 화면. 계정 / 별 충전 / 보호자 / 알림 / 약관 / 앱 정보 / 위험 영역 섹션으로 구성한다.
struct SettingsView: View {
    @Environment(AuthState.self) private var auth
    @Environment(\.dismiss) private var dismiss

    /// 부모(HomeRouter)에서 프로필 선택 상태 초기화를 위해 콜백 주입.
    var onSwitchProfile: () -> Void
    var onSignOut: () -> Void

    @State private var showDeleteSheet: Bool = false
    @State private var pushManager = PushManager.shared

    var body: some View {
        ZStack(alignment: .top) {
            Color.smapBackground.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 0) {
                pageHeader
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .padding(.bottom, 8)
                List {
                    accountSection
                    storeSection
                    notificationSection
                    parentsSection
                    legalSection
                    appInfoSection
                    dangerSection
                }
                .environment(\.font, Font.atozRegular(17))
                .listStyle(.insetGrouped)
                .scrollContentBackground(.hidden)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .task { await pushManager.refreshAuthorizationStatus() }
        .sheet(isPresented: $showDeleteSheet) {
            NavigationStack {
                DeleteAccountView(onCompleted: {
                    showDeleteSheet = false
                    onSignOut()
                })
            }
        }
    }

    // MARK: - Header

    private var pageHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("설정")
                .font(Font.atozBlack(34))
                .foregroundStyle(Color.smapText)
            Text("계정과 알림, 약관을 관리해요")
                .font(Font.atozRegular(15))
                .foregroundStyle(Color.smapMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - 계정

    private var accountSection: some View {
        Section {
            Button {
                onSwitchProfile()
                dismiss()
            } label: {
                Label("프로필 전환", systemImage: "person.crop.circle.badge.questionmark")
                    .font(Font.atozBold(17))
                    .foregroundStyle(Color.smapText)
            }

            Button(role: .destructive) {
                Task {
                    // 로그아웃 전에 푸시 등록을 백엔드에서 해제. 실패해도 로그아웃은 진행.
                    await pushManager.unregister()
                    auth.signOut()
                    onSignOut()
                }
            } label: {
                Label("로그아웃", systemImage: "rectangle.portrait.and.arrow.right")
                    .font(Font.atozBold(17))
            }
        } header: {
            sectionHeader("계정", icon: "person.crop.circle.fill", color: .smapText)
        }
    }

    // MARK: - 알림

    private var notificationSection: some View {
        Section {
            switch pushManager.authorizationStatus {
            case .notDetermined:
                Button {
                    Task { await pushManager.requestAuthorization() }
                } label: {
                    Label("푸시 알림 받기", systemImage: "bell.badge")
                        .font(Font.atozBold(17))
                        .foregroundStyle(Color.smapText)
                }
            case .denied:
                Button {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    Label("푸시 알림 허용하기", systemImage: "bell.slash")
                        .font(Font.atozBold(17))
                        .foregroundStyle(Color.smapText)
                }
            case .authorized, .provisional, .ephemeral:
                HStack {
                    Label("푸시 알림", systemImage: "bell.fill")
                        .font(Font.atozBold(17))
                        .foregroundStyle(Color.smapText)
                    Spacer()
                    Text("켜짐")
                        .font(Font.atozBold(13))
                        .foregroundStyle(Color.smapPrimary)
                }
            @unknown default:
                EmptyView()
            }
        } header: {
            sectionHeader("알림", icon: "bell.fill", color: Color(hex: 0x5288C6))
        } footer: {
            Text("새 동화가 완성되거나 보호자 리포트가 준비되면 알려드릴게요.")
                .font(Font.atozRegular(13))
                .foregroundStyle(Color.smapMuted)
        }
    }

    // MARK: - 별 충전 (IAP)

    private var storeSection: some View {
        Section {
            NavigationLink {
                StoreView()
            } label: {
                Label("별 충전", systemImage: "sparkles")
                    .font(Font.atozBold(17))
                    .foregroundStyle(Color.smapText)
            }
        } header: {
            sectionHeader("별 충전", icon: "sparkles", color: .smapWarn)
        } footer: {
            Text("결제는 Apple App Store를 통해 안전하게 처리됩니다.")
                .font(Font.atozRegular(13))
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
                    .font(Font.atozBold(17))
                    .foregroundStyle(Color.smapText)
            }
        } header: {
            sectionHeader("보호자 모드", icon: "person.2.fill", color: .smapPrimary)
        } footer: {
            Text("PIN으로 잠긴 보호자 전용 영역입니다. 30분 후 자동 잠금됩니다.")
                .font(Font.atozRegular(13))
                .foregroundStyle(Color.smapMuted)
        }
    }

    // MARK: - 법적 정보

    private var legalSection: some View {
        Section {
            ForEach(LegalDocument.allCases) { doc in
                NavigationLink {
                    LegalDocumentView(document: doc)
                } label: {
                    Text(doc.title)
                        .font(Font.atozBold(17))
                        .foregroundStyle(Color.smapText)
                }
            }
        } header: {
            sectionHeader("법적 정보", icon: "doc.text.fill", color: .smapMuted)
        }
    }

    // MARK: - 앱 정보

    private var appInfoSection: some View {
        Section {
            row(title: "서비스", value: BusinessInfo.serviceName)
            row(title: "운영자", value: BusinessInfo.companyName)
            row(title: "버전", value: appVersion)
            Link(destination: URL(string: "mailto:\(BusinessInfo.email)")!) {
                row(title: "고객 문의", value: BusinessInfo.email)
            }
            .buttonStyle(.plain)
        } header: {
            sectionHeader("앱 정보", icon: "info.circle.fill", color: .smapMuted)
        }
    }

    // MARK: - 위험 영역

    private var dangerSection: some View {
        Section {
            Button(role: .destructive) {
                showDeleteSheet = true
            } label: {
                Label("계정 삭제", systemImage: "trash")
                    .font(Font.atozBold(17))
            }
        } header: {
            sectionHeader("위험 영역", icon: "exclamationmark.triangle.fill", color: .smapDanger)
        } footer: {
            Text("계정을 삭제하면 모든 책·학습 기록·결제 이력이 영구적으로 사라지며 복구할 수 없습니다.")
                .font(Font.atozRegular(13))
                .foregroundStyle(Color.smapMuted)
        }
    }

    // MARK: - Helpers

    /// 섹션 헤더 — 아이콘 + 색으로 섹션 정체성을 즉시 구분.
    /// 모든 섹션이 같은 회색 텍스트면 시각적 위계가 약해 어떤 영역인지 파악하기 어려워진다.
    private func sectionHeader(_ title: String, icon: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .bold))
            Text(title)
                .font(Font.atozBold(14))
        }
        .foregroundStyle(color)
        .textCase(nil) // SwiftUI 기본 uppercased 비활성
        .padding(.top, 4)
    }

    private func row(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(Font.atozBold(17))
                .foregroundStyle(Color.smapText)
            Spacer()
            Text(value)
                .font(Font.atozRegular(17))
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
