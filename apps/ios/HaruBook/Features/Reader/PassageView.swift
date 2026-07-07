import SwiftUI

/// 한 페이지(passage)의 본문 + 장면 이미지(있을 때만).
/// 듣기/한글/페이지 네비게이션은 `ReaderView`의 하단 통합 컨트롤바가 담당한다.
struct PassageView: View {
    let passage: Passage
    let vocabulary: [VocabularyEntry]
    let showsKorean: Bool
    let isPlaying: Bool
    let textScale: ReaderTextScale
    /// 이 passage의 책 속 미션. nil이면(레거시 책 포함) 미션 UI 없이 기존과 동일하게 렌더.
    let mission: Mission?
    let missionDone: Bool
    /// 밑줄 단어 팝오버가 열릴 때 탭한 단어를 전달 — 워드 헌트 완료 판정용(ReaderViewModel).
    let onWordTap: (String) -> Void
    /// 확인 질문(check) 정답 시 호출.
    let onMissionComplete: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                sceneSection

                passageBody
                    .padding(12)
                    .background(
                        isPlaying ? Color.smapPrimarySoft : Color.clear,
                        in: RoundedRectangle(cornerRadius: 12)
                    )

                // 책 속 미션 — 본문 아래·한글 해석 위(웹 reader와 동일 순서). 진행을 막지 않는 재미 요소.
                if let mission {
                    PassageMissionCard(
                        mission: mission,
                        done: missionDone,
                        onComplete: onMissionComplete,
                    )
                }

                if showsKorean, let textKo = passage.textKo, !textKo.isEmpty {
                    koreanCard(textKo: textKo)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.97, anchor: .top)),
                            removal: .opacity,
                        ))
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
            // 한글 카드의 등장/사라짐 transition이 부드럽게 보이도록 부모에서 animation 트리거.
            .animation(.easeInOut(duration: 0.25), value: showsKorean)
        }
        .scrollIndicators(.hidden)
    }

    /// 한글 해석을 본문과 시각적으로 분리된 카드로 표현. 웹 reader와 동일하게 secondary 톤의 둥근 카드 +
    /// 상단에 작은 "한글 해석" 배지로 위계를 명확히 한다. Divider + 회색 텍스트만 두던 기존 표현이
    /// 본문과 구분이 약하고 단조로워 "촌스럽다"는 피드백을 반영.
    private func koreanCard(textKo: String) -> some View {
        // 한글 폰트는 본문보다 1~2 단계 작게 — 영문 본문이 주연이고 한글은 보조. 너무 커지지 않게 24pt 상한.
        let koSize = min(max(textScale.fontSize * 0.72, 16), 24)
        // 코랄 톤이 앱 전반에서 과해진다는 피드백을 반영해 한글 카드는 Stone Surface(secondary) 톤으로 분리.
        // 영문 본문(코랄 highlight 가능) ↔ 한글 해석(차분한 회색) 시각 위계가 더 명확해진다.
        return VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "character.book.closed.fill")
                    .font(.system(size: 11, weight: .bold))
                Text("한글 해석")
                    .font(Font.atozBold(12))
            }
            .foregroundStyle(Color.smapMuted)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Color.smapSurface, in: Capsule())
            .overlay(Capsule().stroke(Color.smapBorder, lineWidth: 1))

            Text(textKo)
                .font(Font.atozRegular(koSize))
                .foregroundStyle(Color.smapText)
                .lineSpacing(6)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            Color.smapMutedBg,
            in: RoundedRectangle(cornerRadius: 22, style: .continuous),
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1),
        )
    }

    /// vocabulary가 있으면 본문을 토큰화해 매칭 단어를 클릭 가능한 popover trigger로,
    /// 없으면 plain Text로 렌더.
    @ViewBuilder
    private var passageBody: some View {
        let vocabMap = Self.buildVocabMap(vocabulary)
        if vocabMap.isEmpty {
            Text(passage.textEn)
                .font(Font.atozRegular(textScale.fontSize))
                .foregroundStyle(Color.smapText)
                .lineSpacing(8)
        } else {
            VocabAwarePassageText(
                text: passage.textEn,
                vocabMap: vocabMap,
                fontSize: textScale.fontSize,
                onWordTap: onWordTap,
            )
        }
    }

    @ViewBuilder
    private var sceneSection: some View {
        if let path = passage.sceneImagePath, !path.isEmpty {
            AuthenticatedAsyncImage(
                path: path,
                placeholder: { ScenePlaceholder(isLoading: true) },
                failure: { ScenePlaceholder(isLoading: false) }
            )
            .frame(maxWidth: .infinity)
            .frame(height: 200)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
        // 장면 이미지가 없으면 자리를 비워두고 본문에 집중. 자동 생성 트리거를 노출하지 않는다.
    }

    // MARK: - Vocab map helper

    fileprivate static func normalize(_ w: String) -> String {
        var s = w.trimmingCharacters(in: .whitespaces).lowercased()
        s.removeAll(where: { ".,!?;:\"'".contains($0) })
        return s
    }

    fileprivate static func buildVocabMap(_ entries: [VocabularyEntry]) -> [String: VocabularyEntry] {
        var map: [String: VocabularyEntry] = [:]
        for entry in entries {
            let key = normalize(entry.word)
            guard !key.isEmpty, map[key] == nil else { continue }
            map[key] = entry
        }
        return map
    }
}

/// 본문을 단어/공백/구두점 토큰으로 분해한 뒤 FlowLayout에 흘려넣어 줄바꿈 가능한 인라인
/// 강조 단어를 만든다. SwiftUI `Text`로는 다른 View를 inline 삽입할 방법이 없어 분리한 구성.
private struct VocabAwarePassageText: View {
    let text: String
    let vocabMap: [String: VocabularyEntry]
    let fontSize: CGFloat
    /// 밑줄 단어 탭(팝오버 열림) 시 표시 단어를 상위로 전달 — 워드 헌트 판정용.
    let onWordTap: (String) -> Void

    var body: some View {
        FlowLayout(spacing: 0) {
            ForEach(tokens) { token in
                if token.isWord, let entry = vocabMap[PassageView.normalize(token.text)] {
                    VocabWord(displayWord: token.text, entry: entry, fontSize: fontSize, onTap: onWordTap)
                } else {
                    Text(token.text)
                        .font(Font.atozRegular(fontSize))
                        .foregroundStyle(Color.smapText)
                }
            }
        }
    }

    private var tokens: [Token] {
        var result: [Token] = []
        var current = ""
        var inWord = false

        func flush() {
            guard !current.isEmpty else { return }
            result.append(Token(text: current, isWord: inWord))
            current = ""
        }

        for ch in text {
            let isAlpha = ch.isLetter || ch == "'" || ch == "-"
            if isAlpha {
                if !inWord { flush(); inWord = true }
                current.append(ch)
            } else {
                if inWord { flush(); inWord = false }
                current.append(ch)
            }
        }
        flush()
        return result
    }

    fileprivate struct Token: Identifiable {
        let id = UUID()
        let text: String
        let isWord: Bool
    }
}

/// 토큰을 가로로 누적 배치하다 폭 초과 시 다음 줄로 흘리는 단순 flow layout.
/// SwiftUI는 inline Text 안에 다른 View를 삽입할 수 없어 단어 단위 View 시퀀스를
/// 흘려보내는 방식으로 처리한다.
private struct FlowLayout: Layout {
    var spacing: CGFloat = 0

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        let rows = computeRows(subviews: subviews, width: width)
        let height = rows.reduce(0) { $0 + $1.height } + spacing * CGFloat(max(rows.count - 1, 0))
        return CGSize(
            width: width.isFinite ? width : rows.map(\.width).max() ?? 0,
            height: height,
        )
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = computeRows(subviews: subviews, width: bounds.width)
        var y = bounds.minY
        for row in rows {
            var x = bounds.minX
            for index in row.indices {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
                x += size.width
            }
            y += row.height + spacing
        }
    }

    private struct Row {
        var indices: [Int] = []
        var width: CGFloat = 0
        var height: CGFloat = 0
    }

    private func computeRows(subviews: Subviews, width: CGFloat) -> [Row] {
        var rows: [Row] = []
        var current = Row()
        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            if !current.indices.isEmpty, current.width + size.width > width {
                rows.append(current)
                current = Row()
            }
            current.indices.append(index)
            current.width += size.width
            current.height = max(current.height, size.height)
        }
        if !current.indices.isEmpty { rows.append(current) }
        return rows
    }
}

/// vocabulary 매칭 단어. 탭하면 popover로 한글 뜻을 표시.
private struct VocabWord: View {
    let displayWord: String
    let entry: VocabularyEntry
    let fontSize: CGFloat
    /// 팝오버가 열릴 때 탭한 표시 단어를 상위로 알린다 — 기존 뜻 보기 동작은 그대로.
    let onTap: (String) -> Void
    @State private var showsPopover: Bool = false

    var body: some View {
        Button {
            showsPopover = true
            onTap(displayWord)
        } label: {
            Text(displayWord)
                .font(Font.atozRegular(fontSize))
                .foregroundStyle(Color.smapPrimary)
                .underline(true, pattern: .solid, color: Color.smapPrimary.opacity(0.55))
        }
        .buttonStyle(.plain)
        .popover(isPresented: $showsPopover, arrowEdge: .top) {
            VStack(alignment: .leading, spacing: 6) {
                Text(entry.word)
                    .font(.smapBodyEmphasis)
                    .foregroundStyle(Color.smapPrimary)
                Text(entry.meaning)
                    .font(.smapBody)
                    .foregroundStyle(Color.smapText)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .frame(maxWidth: 260)
            .presentationCompactAdaptation(.popover)
        }
    }
}

private struct ScenePlaceholder: View {
    let isLoading: Bool

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.smapPrimarySoft, Color.smapBackground],
                startPoint: .topLeading,
                endPoint: .bottomTrailing,
            )
            if isLoading {
                ProgressView().tint(Color.smapPrimary)
            } else {
                Image(systemName: "photo.on.rectangle.angled")
                    .font(.system(size: 36))
                    .foregroundStyle(Color.smapPrimary.opacity(0.5))
            }
        }
    }
}
