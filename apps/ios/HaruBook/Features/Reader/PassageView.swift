import SwiftUI

/// 한 페이지(passage)의 본문 + 장면 이미지(있을 때만).
/// 듣기/한글/페이지 네비게이션은 `ReaderView`의 하단 통합 컨트롤바가 담당한다.
struct PassageView: View {
    let passage: Passage
    let vocabulary: [VocabularyEntry]
    let showsKorean: Bool
    let isPlaying: Bool

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

                if showsKorean, let textKo = passage.textKo, !textKo.isEmpty {
                    Divider().background(Color.smapBorder)
                    Text(textKo)
                        .font(.smapBody)
                        .foregroundStyle(Color.smapMuted)
                        .lineSpacing(6)
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .scrollIndicators(.hidden)
    }

    /// vocabulary가 있으면 본문을 토큰화해 매칭 단어를 클릭 가능한 popover trigger로,
    /// 없으면 plain Text로 렌더.
    @ViewBuilder
    private var passageBody: some View {
        let vocabMap = Self.buildVocabMap(vocabulary)
        if vocabMap.isEmpty {
            Text(passage.textEn)
                .font(.smapReader)
                .foregroundStyle(Color.smapText)
                .lineSpacing(8)
        } else {
            VocabAwarePassageText(text: passage.textEn, vocabMap: vocabMap)
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

    var body: some View {
        FlowLayout(spacing: 0) {
            ForEach(tokens) { token in
                if token.isWord, let entry = vocabMap[PassageView.normalize(token.text)] {
                    VocabWord(displayWord: token.text, entry: entry)
                } else {
                    Text(token.text)
                        .font(.smapReader)
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
    @State private var showsPopover: Bool = false

    var body: some View {
        Button {
            showsPopover = true
        } label: {
            Text(displayWord)
                .font(.smapReader)
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
