import SwiftUI

struct BookCardView: View {
    let book: Book

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            cover
                .frame(maxWidth: .infinity)
                .frame(height: 180)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            VStack(alignment: .leading, spacing: 6) {
                Text(book.title)
                    .font(Font.atozBold(17))
                    .foregroundStyle(Color.smapText)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                HStack(spacing: 6) {
                    BadgeLabel(text: "\(book.age)세", tone: .neutral)
                    BadgeLabel(text: book.cefr.label, tone: .primary)
                    if let topic = book.topic, !topic.isEmpty {
                        BadgeLabel(text: topic, tone: .neutral)
                            .lineLimit(1)
                    }
                }
            }
        }
        .padding(12)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1)
        )
    }

    @ViewBuilder
    private var cover: some View {
        if let path = book.coverImagePath, !path.isEmpty {
            AuthenticatedAsyncImage(
                path: path,
                placeholder: { CoverPlaceholder(book: book, isLoading: true) },
                failure: { CoverPlaceholder(book: book, isLoading: false) }
            )
        } else {
            CoverPlaceholder(book: book, isLoading: false)
        }
    }
}

/// 커버 이미지가 없을 때(또는 로딩/실패) 보여줄 시각적 폴백.
/// book.id를 시드로 6개 액센트 팔레트 중 하나를 선택해 책마다 톤이 다르게 보이도록 한다.
/// 단조로운 코랄 단색에서 벗어나 웹 cover-art.tsx 정신을 단순화한 형태.
private struct CoverPlaceholder: View {
    let book: Book
    let isLoading: Bool

    private static let palettes: [(start: Color, end: Color)] = [
        (.smapPeach,  .smapGold),     // 노랑 ↔ 코랄
        (.smapMint,   .smapAccent),   // 민트 ↔ 스카이
        (.smapAccent, .smapLilac),    // 스카이 ↔ 라일락
        (.smapRose,   .smapPeach),    // 로즈 ↔ 피치
        (.smapLilac,  .smapMint),     // 라일락 ↔ 민트
        (.smapGold,   .smapRose),     // 골드 ↔ 로즈
    ]

    private var palette: (start: Color, end: Color) {
        let idx = abs(book.id) % Self.palettes.count
        return Self.palettes[idx]
    }

    private var initial: String {
        // 한글/영문 모두에서 자연스러운 첫 그래핌.
        guard let first = book.title.first else { return "📖" }
        return String(first)
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [palette.start, palette.end],
                startPoint: .topLeading,
                endPoint: .bottomTrailing,
            )

            VStack(spacing: 10) {
                if isLoading {
                    ProgressView().tint(Color.smapText.opacity(0.5))
                } else {
                    Text(initial)
                        .font(Font.atozBlack(56))
                        .foregroundStyle(Color.smapText.opacity(0.85))
                }
            }
        }
    }
}
