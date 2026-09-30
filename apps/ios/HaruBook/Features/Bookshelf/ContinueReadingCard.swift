import SwiftUI

/// 책장 상단 "이어 읽기" CTA. 웹 `ContinueCard` 패리티 — 가로 썸네일 + 제목 + 탭으로 Reader.
/// `continueBookId`가 목록에 있을 때만 부모가 렌더한다.
struct ContinueReadingCard: View {
    let book: Book

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            cover
                .frame(width: 112, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 4) {
                Text("이어 읽기")
                    .font(Font.atozBold(11))
                    .foregroundStyle(Color.smapPrimaryForeground)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.smapPrimarySoft, in: Capsule())
                Text(book.title)
                    .font(.smapBodyEmphasis)
                    .foregroundStyle(Color.smapText)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                Text("읽는 중")
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color.smapMuted)
        }
        .padding(12)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("이어 읽기, \(book.title)")
        .accessibilityAddTraits(.isButton)
    }

    @ViewBuilder
    private var cover: some View {
        if let path = book.coverImagePath, !path.isEmpty {
            AuthenticatedAsyncImage(
                path: path,
                placeholder: { Color.smapMutedBg },
                failure: { Color.smapMutedBg }
            )
        } else {
            Color.smapMutedBg
                .overlay {
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(Color.smapMuted)
                }
        }
    }
}
