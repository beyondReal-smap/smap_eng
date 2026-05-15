import SwiftUI

/// 보호자 모드 PIN 게이트. 통과 시 `WeeklyReportView`로 전환.
///  - PIN 미설정: 4자리 입력 → 확인 입력 → 저장
///  - PIN 설정됨: 4자리 입력 → 일치하면 진입
///  - 30분 내 재진입: 자동 통과 (게이트 표시 안 함)
struct ParentalPinGateView: View {
    @State private var pinStore = ParentalPinStore.shared

    // 신규 설정 단계 — pin1 입력 → pin2 확인 입력.
    @State private var newPin1: String = ""
    @State private var newPin2: String = ""
    @State private var step: SetupStep = .firstEntry

    // 잠금 해제 단계.
    @State private var entered: String = ""
    @State private var errorMessage: String?
    @State private var shakeToken: Int = 0

    private enum SetupStep {
        case firstEntry
        case confirmEntry
    }

    var body: some View {
        Group {
            if pinStore.isUnlocked {
                WeeklyReportView(onLock: {
                    pinStore.lock()
                    entered = ""
                    errorMessage = nil
                })
            } else if pinStore.hasPin {
                unlockView
            } else {
                setupView
            }
        }
        .navigationTitle("보호자 모드")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Setup

    private var setupView: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()
            VStack(spacing: 28) {
                VStack(spacing: 8) {
                    Image(systemName: "lock.shield")
                        .font(.system(size: 48))
                        .foregroundStyle(Color.smapPrimary)
                    Text(step == .firstEntry ? "보호자 PIN을 만들어주세요" : "한 번 더 입력해 주세요")
                        .font(.smapTitle)
                        .foregroundStyle(Color.smapText)
                    Text("아이가 보호자 모드에 실수로 들어가지 않도록 4자리 숫자로 잠그는 단순 PIN입니다.")
                        .font(.smapCaption)
                        .foregroundStyle(Color.smapMuted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                PinPadView(
                    value: step == .firstEntry ? $newPin1 : $newPin2,
                    onComplete: { value in
                        if step == .firstEntry {
                            // 다음 단계로 전환.
                            step = .confirmEntry
                        } else if value == newPin1 {
                            do {
                                try pinStore.setPin(value)
                                // setPin이 unlock도 처리.
                            } catch {
                                errorMessage = "PIN 저장에 실패했어요. 다시 시도해 주세요."
                            }
                        } else {
                            shakeToken += 1
                            errorMessage = "두 PIN이 달라요. 다시 입력해 주세요."
                            newPin1 = ""
                            newPin2 = ""
                            step = .firstEntry
                        }
                    },
                    shakeToken: shakeToken,
                )

                if let errorMessage {
                    Text(errorMessage)
                        .font(.smapCaption)
                        .foregroundStyle(Color.smapDanger)
                }

                Spacer()
            }
            .padding(.top, 48)
        }
    }

    // MARK: - Unlock

    private var unlockView: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()
            VStack(spacing: 28) {
                VStack(spacing: 8) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(Color.smapPrimary)
                    Text("보호자 PIN을 입력해 주세요")
                        .font(.smapTitle)
                        .foregroundStyle(Color.smapText)
                    Text("입력 후 30분 동안 자동으로 보호자 모드가 유지됩니다.")
                        .font(.smapCaption)
                        .foregroundStyle(Color.smapMuted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                PinPadView(
                    value: $entered,
                    onComplete: { value in
                        if pinStore.unlock(with: value) {
                            entered = ""
                            errorMessage = nil
                        } else {
                            shakeToken += 1
                            errorMessage = "PIN이 달라요. 다시 입력해 주세요."
                            entered = ""
                        }
                    },
                    shakeToken: shakeToken,
                )

                if let errorMessage {
                    Text(errorMessage)
                        .font(.smapCaption)
                        .foregroundStyle(Color.smapDanger)
                }

                Spacer()

                Button {
                    pinStore.reset()
                    entered = ""
                    errorMessage = nil
                    step = .firstEntry
                    newPin1 = ""
                    newPin2 = ""
                } label: {
                    Text("PIN을 잊으셨나요? 다시 설정")
                        .font(.smapCaption)
                        .foregroundStyle(Color.smapMuted)
                        .underline()
                }
                .buttonStyle(.plain)
                .padding(.bottom, 24)
            }
            .padding(.top, 48)
        }
    }
}
