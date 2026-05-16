import SwiftUI

struct LevelPickerStep: View {
    let genre: CreateBookViewModel.Genre?
    let selected: CefrLevel?
    let onSelect: (CefrLevel) -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("어떤 레벨로 만들까요?")
                        .font(.smapTitle)
                        .foregroundStyle(Color.smapText)
                    Text("아이의 영어 수준에 맞게 골라주세요. 나중에 다시 바꿀 수 있어요.")
                        .font(.smapBody)
                        .foregroundStyle(Color.smapMuted)
                }

                VStack(spacing: 12) {
                    ForEach(CefrLevel.allCases) { level in
                        Button { onSelect(level) } label: {
                            HStack(alignment: .center, spacing: 14) {
                                // 동그라미 40pt로 축소 — 헤드라인이 한 줄에 들어가도록 가로 공간 확보.
                                Text(level.label)
                                    .font(Font.atozBlack(14))
                                    .foregroundStyle(level == selected ? .white : Color.smapPrimary)
                                    .frame(width: 40, height: 40)
                                    .background(
                                        level == selected ? Color.smapPrimary : Color.smapPrimarySoft,
                                        in: Circle()
                                    )
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(headline(for: level))
                                        .font(.smapBodyEmphasis)
                                        .foregroundStyle(Color.smapText)
                                        .lineLimit(1)
                                        .minimumScaleFactor(0.85)
                                    Text(detail(for: level))
                                        .font(.smapCaption)
                                        .foregroundStyle(Color.smapMuted)
                                        .lineLimit(1)
                                        .minimumScaleFactor(0.85)
                                }
                                Spacer()
                            }
                            .padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.smapSurface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 20, style: .continuous)
                                    .stroke(level == selected ? Color.smapPrimary : Color.smapBorder, lineWidth: level == selected ? 2 : 1)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
    }

    /// 레벨 코드(A1/A2/B1/B2)는 동그라미에 이미 표시되므로 headline에서는 제외 — 줄바꿈 방지 + 정보 중복 제거.
    private func headline(for level: CefrLevel) -> String {
        switch level {
        case .a1: return "처음 시작 · 5~7세"
        case .a2: return "자주 쓰는 표현 · 7~9세"
        case .b1: return "자기 의견 표현 · 9~10세"
        case .b2: return "능숙한 표현"
        }
    }

    private func detail(for level: CefrLevel) -> String {
        switch level {
        case .a1: return "기초 단어 · 짧은 문장 · 현재형"
        case .a2: return "과거형 · 일상 표현 · 간단한 접속사"
        case .b1: return "긴 문장 · 감정 표현 · 관계절"
        case .b2: return "복합 문장 · 추상 개념 · 토론"
        }
    }
}
