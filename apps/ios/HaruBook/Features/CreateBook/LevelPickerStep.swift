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
                            HStack(alignment: .top, spacing: 16) {
                                Text(level.label)
                                    .font(.smapHeading)
                                    .foregroundStyle(level == selected ? .white : Color.smapPrimary)
                                    .frame(width: 56, height: 56)
                                    .background(
                                        level == selected ? Color.smapPrimary : Color.smapPrimarySoft,
                                        in: Circle()
                                    )
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(headline(for: level))
                                        .font(.smapBodyEmphasis)
                                        .foregroundStyle(Color.smapText)
                                    Text(detail(for: level))
                                        .font(.smapCaption)
                                        .foregroundStyle(Color.smapMuted)
                                }
                                Spacer()
                            }
                            .padding(18)
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

    private func headline(for level: CefrLevel) -> String {
        switch level {
        case .a1: return "A1 — 처음 시작 (5~7세)"
        case .a2: return "A2 — 자주 쓰는 표현 (7~9세)"
        case .b1: return "B1 — 자기 의견 표현 (9~10세)"
        }
    }

    private func detail(for level: CefrLevel) -> String {
        switch level {
        case .a1: return "기초 단어 · 짧은 문장 · 현재형"
        case .a2: return "과거형 · 일상 표현 · 간단한 접속사"
        case .b1: return "긴 문장 · 감정 표현 · 관계절"
        }
    }
}
