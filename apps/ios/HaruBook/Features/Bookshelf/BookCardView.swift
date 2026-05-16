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

/// 커버 이미지가 없을 때(또는 로딩/실패)의 시각적 폴백.
///
/// 웹의 24종 SVG `CoverArt`를 가볍게 모티프 차용한 6종 SwiftUI 일러스트 + 6 팔레트로
/// 책표지 인상을 낸다(36 조합). `book.id`를 시드로 결정론적으로 선택한다.
/// 단순 SF Symbol 한 개만 띄우던 기존 폴백이 "책 같지 않다"는 피드백을 반영.
private struct CoverPlaceholder: View {
    let book: Book
    let isLoading: Bool

    private enum Template: CaseIterable {
        case mountain      // 산 + 태양
        case forest        // 숲
        case ocean         // 바다 + 돛단배
        case nightSky      // 밤하늘 + 달과 별
        case castle        // 성
        case balloon       // 열기구
    }

    private static let palettes: [(top: Color, bottom: Color, accent: Color)] = [
        (.smapPeach,  .smapGold,   .smapRose),    // 따뜻한 일출
        (.smapMint,   .smapAccent, .smapLilac),   // 청량한 새벽
        (.smapAccent, .smapLilac,  .smapRose),    // 보랏빛 노을
        (.smapRose,   .smapPeach,  .smapGold),    // 분홍 황혼
        (.smapGold,   .smapPeach,  .smapMint),    // 황금빛 들녘
        (.smapLilac,  .smapMint,   .smapAccent),  // 차분한 안개
    ]

    private var template: Template {
        Template.allCases[abs(book.id) % Template.allCases.count]
    }

    private var palette: (top: Color, bottom: Color, accent: Color) {
        Self.palettes[abs(book.id / 7) % Self.palettes.count]
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                LinearGradient(
                    colors: [palette.top, palette.bottom],
                    startPoint: .top,
                    endPoint: .bottom,
                )

                illustration(in: geo.size)
                    .opacity(0.92)

                // 책표지처럼 하단에 큰 제목.
                VStack {
                    Spacer()
                    Text(book.title)
                        .font(Font.atozBlack(18))
                        .foregroundStyle(Color.white)
                        .shadow(color: Color.black.opacity(0.35), radius: 3, x: 0, y: 1)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .padding(.horizontal, 10)
                        .padding(.bottom, 12)
                }

                if isLoading {
                    ProgressView().tint(.white)
                }
            }
        }
    }

    @ViewBuilder
    private func illustration(in size: CGSize) -> some View {
        switch template {
        case .mountain: MountainIllustration(palette: palette, size: size)
        case .forest:   ForestIllustration(palette: palette, size: size)
        case .ocean:    OceanIllustration(palette: palette, size: size)
        case .nightSky: NightSkyIllustration(palette: palette, size: size)
        case .castle:   CastleIllustration(palette: palette, size: size)
        case .balloon:  BalloonIllustration(palette: palette, size: size)
        }
    }
}

// MARK: - 일러스트 6종 (SwiftUI Shape 조합 기반)

private struct IllustrationPalette {
    let top: Color
    let bottom: Color
    let accent: Color
}

private struct MountainIllustration: View {
    let palette: (top: Color, bottom: Color, accent: Color)
    let size: CGSize

    var body: some View {
        ZStack {
            // 태양
            Circle()
                .fill(palette.accent.opacity(0.85))
                .frame(width: size.width * 0.32, height: size.width * 0.32)
                .position(x: size.width * 0.72, y: size.height * 0.28)

            // 뒷산
            TriangleShape()
                .fill(Color.white.opacity(0.35))
                .frame(width: size.width * 0.7, height: size.height * 0.45)
                .position(x: size.width * 0.35, y: size.height * 0.6)

            // 앞산
            TriangleShape()
                .fill(Color.black.opacity(0.25))
                .frame(width: size.width * 0.85, height: size.height * 0.38)
                .position(x: size.width * 0.65, y: size.height * 0.68)
        }
    }
}

private struct ForestIllustration: View {
    let palette: (top: Color, bottom: Color, accent: Color)
    let size: CGSize

    var body: some View {
        ZStack {
            // 태양/달
            Circle()
                .fill(palette.accent.opacity(0.7))
                .frame(width: size.width * 0.22, height: size.width * 0.22)
                .position(x: size.width * 0.78, y: size.height * 0.22)

            ForEach(Array(treePositions.enumerated()), id: \.offset) { _, pos in
                TreeShape()
                    .fill(Color.black.opacity(0.3))
                    .frame(width: size.width * 0.18, height: size.height * pos.h)
                    .position(x: size.width * pos.x, y: size.height * pos.y)
            }
        }
    }

    private var treePositions: [(x: CGFloat, y: CGFloat, h: CGFloat)] {
        [
            (0.15, 0.65, 0.45),
            (0.35, 0.6,  0.55),
            (0.55, 0.66, 0.42),
            (0.78, 0.62, 0.5),
        ]
    }
}

private struct OceanIllustration: View {
    let palette: (top: Color, bottom: Color, accent: Color)
    let size: CGSize

    var body: some View {
        ZStack {
            // 태양
            Circle()
                .fill(palette.accent.opacity(0.75))
                .frame(width: size.width * 0.26, height: size.width * 0.26)
                .position(x: size.width * 0.25, y: size.height * 0.25)

            // 배 - 사다리꼴 선체 + 삼각형 돛
            ZStack {
                TrapezoidShape()
                    .fill(Color.white.opacity(0.85))
                    .frame(width: size.width * 0.28, height: size.height * 0.08)
                    .offset(y: size.height * 0.18)
                TriangleShape()
                    .fill(palette.accent.opacity(0.9))
                    .frame(width: size.width * 0.18, height: size.height * 0.22)
                    .offset(y: size.height * 0.03)
            }
            .position(x: size.width * 0.6, y: size.height * 0.5)

            // 파도 2겹
            WaveShape(phase: 0)
                .fill(Color.white.opacity(0.4))
                .frame(height: size.height * 0.25)
                .position(x: size.width / 2, y: size.height * 0.78)
            WaveShape(phase: .pi)
                .fill(Color.black.opacity(0.18))
                .frame(height: size.height * 0.22)
                .position(x: size.width / 2, y: size.height * 0.88)
        }
    }
}

private struct NightSkyIllustration: View {
    let palette: (top: Color, bottom: Color, accent: Color)
    let size: CGSize

    var body: some View {
        ZStack {
            // 달
            Circle()
                .fill(Color.white.opacity(0.95))
                .frame(width: size.width * 0.28, height: size.width * 0.28)
                .position(x: size.width * 0.7, y: size.height * 0.28)
            // 달 그림자 (초승달 느낌)
            Circle()
                .fill(palette.top)
                .frame(width: size.width * 0.24, height: size.width * 0.24)
                .position(x: size.width * 0.78, y: size.height * 0.25)

            // 별들 - 시드와 무관하게 일정한 위치
            ForEach(Array(stars.enumerated()), id: \.offset) { _, star in
                Image(systemName: "sparkle")
                    .font(.system(size: size.width * star.size, weight: .bold))
                    .foregroundStyle(Color.white.opacity(0.9))
                    .position(x: size.width * star.x, y: size.height * star.y)
            }
        }
    }

    private var stars: [(x: CGFloat, y: CGFloat, size: CGFloat)] {
        [
            (0.18, 0.18, 0.07),
            (0.32, 0.4,  0.05),
            (0.5,  0.22, 0.06),
            (0.15, 0.55, 0.06),
            (0.42, 0.7,  0.05),
            (0.85, 0.55, 0.06),
        ]
    }
}

private struct CastleIllustration: View {
    let palette: (top: Color, bottom: Color, accent: Color)
    let size: CGSize

    var body: some View {
        ZStack {
            // 본채
            Rectangle()
                .fill(Color.white.opacity(0.6))
                .frame(width: size.width * 0.4, height: size.height * 0.32)
                .position(x: size.width * 0.5, y: size.height * 0.55)

            // 좌측 탑
            ZStack {
                Rectangle()
                    .fill(Color.white.opacity(0.7))
                    .frame(width: size.width * 0.14, height: size.height * 0.45)
                TriangleShape()
                    .fill(palette.accent)
                    .frame(width: size.width * 0.16, height: size.height * 0.14)
                    .offset(y: -size.height * 0.22)
            }
            .position(x: size.width * 0.28, y: size.height * 0.55)

            // 우측 탑
            ZStack {
                Rectangle()
                    .fill(Color.white.opacity(0.7))
                    .frame(width: size.width * 0.14, height: size.height * 0.5)
                TriangleShape()
                    .fill(palette.accent)
                    .frame(width: size.width * 0.16, height: size.height * 0.14)
                    .offset(y: -size.height * 0.25)
            }
            .position(x: size.width * 0.72, y: size.height * 0.52)

            // 정문
            Rectangle()
                .fill(Color.black.opacity(0.45))
                .frame(width: size.width * 0.1, height: size.height * 0.16)
                .position(x: size.width * 0.5, y: size.height * 0.63)
        }
    }
}

private struct BalloonIllustration: View {
    let palette: (top: Color, bottom: Color, accent: Color)
    let size: CGSize

    var body: some View {
        ZStack {
            // 구름 2개
            CloudShape()
                .fill(Color.white.opacity(0.7))
                .frame(width: size.width * 0.35, height: size.height * 0.13)
                .position(x: size.width * 0.2, y: size.height * 0.7)
            CloudShape()
                .fill(Color.white.opacity(0.55))
                .frame(width: size.width * 0.3, height: size.height * 0.11)
                .position(x: size.width * 0.75, y: size.height * 0.78)

            // 열기구 — 풍선 + 줄 + 바구니
            ZStack {
                Circle()
                    .fill(palette.accent.opacity(0.95))
                    .frame(width: size.width * 0.3, height: size.width * 0.3)
                    .offset(y: -size.height * 0.05)
                Rectangle()
                    .fill(Color.black.opacity(0.35))
                    .frame(width: size.width * 0.005, height: size.height * 0.08)
                    .offset(x: -size.width * 0.04, y: size.height * 0.1)
                Rectangle()
                    .fill(Color.black.opacity(0.35))
                    .frame(width: size.width * 0.005, height: size.height * 0.08)
                    .offset(x: size.width * 0.04, y: size.height * 0.1)
                Rectangle()
                    .fill(Color.black.opacity(0.55))
                    .frame(width: size.width * 0.12, height: size.height * 0.05)
                    .offset(y: size.height * 0.16)
            }
            .position(x: size.width * 0.55, y: size.height * 0.4)
        }
    }
}

// MARK: - Shape primitives

private struct TriangleShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.midX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.closeSubpath()
        return p
    }
}

private struct TrapezoidShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let inset = rect.width * 0.18
        p.move(to: CGPoint(x: rect.minX + inset, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX - inset, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.closeSubpath()
        return p
    }
}

private struct WaveShape: Shape {
    var phase: CGFloat
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let midY = rect.midY
        p.move(to: CGPoint(x: rect.minX, y: midY))
        for x in stride(from: 0, through: rect.width, by: 4) {
            let y = midY + sin((x / rect.width) * .pi * 2 + phase) * rect.height * 0.25
            p.addLine(to: CGPoint(x: x, y: y))
        }
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.closeSubpath()
        return p
    }
}

private struct TreeShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        // 잎(삼각형 2단)
        p.move(to: CGPoint(x: rect.midX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + rect.height * 0.45))
        p.addLine(to: CGPoint(x: rect.midX + rect.width * 0.22, y: rect.minY + rect.height * 0.45))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + rect.height * 0.75))
        p.addLine(to: CGPoint(x: rect.midX + rect.width * 0.1, y: rect.minY + rect.height * 0.75))
        // 몸통
        p.addLine(to: CGPoint(x: rect.midX + rect.width * 0.1, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.midX - rect.width * 0.1, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.midX - rect.width * 0.1, y: rect.minY + rect.height * 0.75))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY + rect.height * 0.75))
        p.addLine(to: CGPoint(x: rect.midX - rect.width * 0.22, y: rect.minY + rect.height * 0.45))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY + rect.height * 0.45))
        p.closeSubpath()
        return p
    }
}

private struct CloudShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let r = rect.height / 2
        p.addEllipse(in: CGRect(x: rect.minX, y: rect.minY + r * 0.3, width: r * 2, height: r * 1.6))
        p.addEllipse(in: CGRect(x: rect.minX + r * 0.9, y: rect.minY, width: r * 2.4, height: r * 2))
        p.addEllipse(in: CGRect(x: rect.minX + r * 2.2, y: rect.minY + r * 0.4, width: r * 2, height: r * 1.5))
        return p
    }
}
