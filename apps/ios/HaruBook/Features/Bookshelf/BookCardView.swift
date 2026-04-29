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
                    .font(.smapBodyEmphasis)
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
                placeholder: { CoverPlaceholder(title: book.title, isLoading: true) },
                failure: { CoverPlaceholder(title: book.title, isLoading: false) }
            )
        } else {
            CoverPlaceholder(title: book.title, isLoading: false)
        }
    }
}

private struct CoverPlaceholder: View {
    let title: String
    let isLoading: Bool

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.smapPrimary, Color.smapPrimarySoft],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            VStack(spacing: 8) {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: "book.fill")
                        .font(.system(size: 36))
                        .foregroundStyle(.white)
                }
                Text(title)
                    .font(.smapCaption)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 12)
                    .lineLimit(2)
            }
        }
    }
}
