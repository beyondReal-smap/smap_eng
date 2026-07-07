import SwiftUI

/// 책 속 미션 카드 — 현재 passage에 미션이 있을 때 본문 아래에 노출. 웹 `passage-mission.tsx` 미러.
///
/// - wordHunt: 완료 판정은 본문(PassageView)의 밑줄 단어 탭에서 일어나므로
///   이 카드는 힌트/완료 상태 표시만 담당한다(완료 신호는 done으로 수신).
/// - check: 2지선다 선택을 카드 내부에서 처리하고 정답 시 onComplete를 호출한다.
///   오답은 부드럽게 재시도 유도 — 감점/실패 카운트 없음(압박 없는 톤).
///
/// 프롬프트는 미션당 wordHunt/check 중 하나만 채우도록 유도하지만, 둘 다 온
/// 경우에도 각각 렌더하고 어느 쪽이든 먼저 완료되면 미션 완료로 간주한다(웹과 동일).
struct PassageMissionCard: View {
    let mission: Mission
    let done: Bool
    let onComplete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let hunt = mission.wordHunt {
                WordHuntCard(hunt: hunt, done: done)
            }
            if let check = mission.check {
                CheckCard(check: check, done: done, onComplete: onComplete)
            }
        }
        // 완료 전환 시 카드가 가볍게 튀며 바뀌도록 — 웹 bounce-in 대응.
        .animation(.spring(response: 0.35, dampingFraction: 0.6), value: done)
    }
}

/// 성공/라벨 텍스트용 진한 잉크 — 파스텔 토큰(smapLevelA1/smapAccent)은 배경용이라
/// 텍스트 대비가 부족해 여기서만 로컬 정의(VocabCardView 상태 칩과 같은 관례).
private extension Color {
    /// 웹 `--level-a1-fg`(deep green ink) 미러.
    static let missionSuccessInk = Color(hex: 0x1E5B2E)
    /// 웹 `--accent-foreground`(deep sky ink) 미러.
    static let missionAccentInk = Color(hex: 0x1E4C66)
}

/// 워드 헌트 카드 — 미완료면 점선 테두리 힌트, 완료면 성공 톤 축하.
private struct WordHuntCard: View {
    let hunt: MissionWordHunt
    let done: Bool

    var body: some View {
        if done {
            (Text("🎉 찾았어요! ") + Text(hunt.targetWord).underline())
                .font(Font.atozBold(15))
                .foregroundStyle(Color.missionSuccessInk)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    Color.smapLevelA1.opacity(0.45),
                    in: RoundedRectangle(cornerRadius: 16, style: .continuous),
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.smapLevelA1, lineWidth: 2),
                )
        } else {
            VStack(alignment: .leading, spacing: 4) {
                Text("🔍 단어 찾기 미션")
                    .font(Font.atozBold(12))
                    // 웹은 text-primary — smapPrimary(파스텔 코랄)는 텍스트 대비가 부족해
                    // 디자인 시스템의 텍스트용 deep coral ink를 사용(ReaderView WCAG 교정과 동일).
                    .foregroundStyle(Color.smapPrimaryForeground)
                Text(hunt.hintKo)
                    .font(Font.atozRegular(15))
                    .foregroundStyle(Color.smapText)
                    .fixedSize(horizontal: false, vertical: true)
                Text("위 문장에서 밑줄 친 단어를 눌러 보세요")
                    .font(Font.atozRegular(12))
                    .foregroundStyle(Color.smapMuted)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                Color.smapPrimarySoft.opacity(0.35),
                in: RoundedRectangle(cornerRadius: 16, style: .continuous),
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    // 0.4 — 웹(border-primary/40)·AOS와 동일한 투명도로 크로스 플랫폼 통일.
                    .stroke(Color.smapPrimary.opacity(0.4), style: StrokeStyle(lineWidth: 2, dash: [6, 4])),
            )
        }
    }
}

/// 확인 질문(2지선다) 카드 — 정답 시 카드 전체가 성공 톤으로 전환, 오답은 해당 버튼만
/// 붉은 톤 + 격려 문구 후 재시도 가능.
private struct CheckCard: View {
    let check: MissionCheck
    let done: Bool
    let onComplete: () -> Void

    /// 마지막으로 고른 오답 인덱스 — 재시도 유도 문구 노출용(감점/실패 카운트 없음).
    @State private var wrongPick: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(done ? "✅ 통과!" : "🧩 깜짝 질문")
                .font(Font.atozBold(12))
                .foregroundStyle(done ? Color.missionSuccessInk : Color.missionAccentInk)

            Text(check.question)
                .font(Font.atozRegular(15))
                .foregroundStyle(Color.smapText)
                .fixedSize(horizontal: false, vertical: true)

            VStack(spacing: 6) {
                ForEach(Array(check.choices.enumerated()), id: \.offset) { ci, choice in
                    choiceButton(index: ci, label: choice)
                }
            }

            if wrongPick != nil && !done {
                Text("괜찮아요, 문장을 다시 읽고 한 번 더 골라 볼까요?")
                    .font(Font.atozRegular(12))
                    .foregroundStyle(Color.smapMuted)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            done ? Color.smapLevelA1.opacity(0.45) : Color.smapAccent.opacity(0.18),
            in: RoundedRectangle(cornerRadius: 16, style: .continuous),
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(
                    done ? Color.smapLevelA1 : Color.smapAccent.opacity(0.9),
                    style: done ? StrokeStyle(lineWidth: 2) : StrokeStyle(lineWidth: 2, dash: [6, 4]),
                ),
        )
    }

    private func choiceButton(index: Int, label: String) -> some View {
        let isAnswer = index == check.answerIndex
        let isWrong = wrongPick == index && !done
        return Button {
            pick(index)
        } label: {
            Text(label)
                .font(Font.atozBold(14))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .foregroundStyle(
                    done && isAnswer ? Color.missionSuccessInk
                        : isWrong ? Color.smapDanger
                        : Color.smapText,
                )
                .background(
                    done && isAnswer ? Color.smapLevelA1
                        : isWrong ? Color.smapDanger.opacity(0.12)
                        : Color.smapSurface,
                    in: RoundedRectangle(cornerRadius: 12, style: .continuous),
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(
                            done && isAnswer ? Color.clear
                                : isWrong ? Color.smapDanger.opacity(0.4)
                                : Color.smapBorder,
                            lineWidth: 1,
                        ),
                )
        }
        .buttonStyle(.plain)
        .disabled(done)
    }

    private func pick(_ index: Int) {
        guard !done else { return }
        if index == check.answerIndex {
            wrongPick = nil
            Haptic.play(.success)
            onComplete()
        } else {
            // 퀴즈와 달리 미션은 부담 없는 재미 요소 — error 대신 가벼운 warning 톤.
            Haptic.play(.warning)
            withAnimation(.easeInOut(duration: 0.2)) { wrongPick = index }
        }
    }
}
