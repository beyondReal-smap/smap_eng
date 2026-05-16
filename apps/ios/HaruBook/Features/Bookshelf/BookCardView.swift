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
/// book.id를 시드로 6 팔레트 × 10 아이콘 = 60 조합. 단조롭지 않게.
private struct CoverPlaceholder: View {
    let book: Book
    let isLoading: Bool

    private static let palettes: [(start: Color, end: Color)] = [
        (.smapPeach,  .smapGold),
        (.smapMint,   .smapAccent),
        (.smapAccent, .smapLilac),
        (.smapRose,   .smapPeach),
        (.smapLilac,  .smapMint),
        (.smapGold,   .smapRose),
    ]

    private static let icons: [String] = [
        "book.fill",
        "sparkles",
        "leaf.fill",
        "sun.max.fill",
        "moon.fill",
        "star.fill",
        "heart.fill",
        "pawprint.fill",
        "music.note",
        "paintbrush.fill",
    ]

    private var palette: (start: Color, end: Color) {
        Self.palettes[abs(book.id) % Self.palettes.count]
    }

    private var icon: String {
        Self.icons[abs(book.id / 7) % Self.icons.count]
    }

    private var initial: String {
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

            // 우상단에 흐릿한 큰 아이콘 — 시드 기반 데코.
            Image(systemName: icon)
                .font(.system(size: 80, weight: .bold))
                .foregroundStyle(Color.white.opacity(0.45))
                .rotationEffect(.degrees(-12))
                .offset(x: 50, y: -32)
                .clipped()

            if isLoading {
                ProgressView().tint(Color.smapText.opacity(0.5))
            } else {
                Text(initial)
                    .font(Font.atozBlack(54))
                    .foregroundStyle(Color.smapText.opacity(0.88))
                    .shadow(color: Color.white.opacity(0.4), radius: 2, x: 0, y: 1)
            }
        }
    }
}
