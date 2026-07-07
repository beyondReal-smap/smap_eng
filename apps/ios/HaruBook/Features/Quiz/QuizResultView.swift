import SwiftUI

struct QuizResultView: View {
    let bookTitle: String
    let score: Int
    let total: Int
    let onRetry: () -> Void
    let onClose: () -> Void

    private var percentage: Int {
        guard total > 0 else { return 0 }
        return Int((Double(score) / Double(total)) * 100)
    }

    private var emoji: String {
        switch percentage {
        case 100: return "🌟"
        case 80...99: return "🎉"
        case 60...79: return "👍"
        default: return "💪"
        }
    }

    private var headline: String {
        switch percentage {
        case 100: return "완벽해요!"
        case 80...99: return "아주 잘했어요!"
        case 60...79: return "조금만 더 연습해 보아요"
        default: return "다시 한 번 도전!"
        }
    }

    /// 이번 세션 획득 포인트 — 완독 +10, 만점 보너스 +20 (웹 ScoreHeader의 sessionPoints 미러).
    private var earnedPoints: Int {
        Rewards.sessionPoints(isPerfect: total > 0 && score == total)
    }

    var body: some View {
        ZStack {
            Color.smapBackground.ignoresSafeArea()
            VStack(spacing: 28) {
                Spacer()

                Text(emoji)
                    .font(.system(size: 88))

                VStack(spacing: 12) {
                    Text(headline)
                        .font(.smapDisplay)
                        .foregroundStyle(Color.smapText)
                    Text(bookTitle)
                        .font(.smapBody)
                        .foregroundStyle(Color.smapMuted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }

                VStack(spacing: 6) {
                    Text("\(score) / \(total)")
                        .font(.system(size: 56, weight: .heavy, design: .rounded))
                        .foregroundStyle(Color.smapPrimary)
                    Text("\(percentage)점")
                        .font(.smapHeading)
                        .foregroundStyle(Color.smapMuted)
                    // 이번 세션 획득 포인트 축하 배지 — 결과 헤더 톤에 맞춘 필(pill).
                    Text("✨ +\(earnedPoints)P 획득!")
                        .font(Font.atozBold(15))
                        .foregroundStyle(Color.smapPrimaryForeground)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .background(Color.smapPrimarySoft, in: Capsule())
                        .padding(.top, 4)
                }

                Spacer()

                VStack(spacing: 12) {
                    PrimaryButton(title: "다시 풀기", variant: .tonal) {
                        onRetry()
                    }
                    PrimaryButton(title: "책장으로 돌아가기", variant: .filled) {
                        onClose()
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
        }
        .navigationBarBackButtonHidden(true)
    }
}
