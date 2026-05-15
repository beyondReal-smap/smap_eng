import SwiftUI

/// 보호자 리포트의 프로필별 카드. 이번 주 집계 + 누적 + 신고된 책.
struct ProfileReportCard: View {
    let report: ParentalProfileReport

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            header
            weeklyStats
            cumulativeStats
            if !report.flaggedBooks.isEmpty {
                Divider()
                flaggedSection
            }
        }
        .padding(18)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1),
        )
    }

    private var header: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.smapPrimarySoft)
                    .frame(width: 48, height: 48)
                Text(report.avatar ?? String(report.name.prefix(1)))
                    .font(.system(size: 24))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(report.name)
                    .font(.smapHeading)
                    .foregroundStyle(Color.smapText)
                Text("\(report.activeDays.count)일 활동")
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapMuted)
            }
            Spacer()
        }
    }

    private var weeklyStats: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("이번 주")
            HStack(spacing: 10) {
                statTile(label: "만든 책", value: "\(report.booksCreatedWeek)", unit: "권")
                statTile(label: "완독 세션", value: "\(report.sessionsFinishedWeek)", unit: "회")
                statTile(
                    label: "평균 정답률",
                    value: report.averageAccuracyWeek
                        .map { "\(Int(($0 * 100).rounded()))" } ?? "—",
                    unit: report.averageAccuracyWeek == nil ? "" : "%",
                )
            }
        }
    }

    private var cumulativeStats: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("누적")
            HStack(spacing: 10) {
                statTile(label: "읽은 책", value: "\(report.totalBooks)", unit: "권")
                statTile(label: "만점", value: "\(report.totalPerfect)", unit: "회")
            }
        }
    }

    private var flaggedSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(Color.smapWarn)
                Text("신고된 책 \(report.flaggedBooks.count)권")
                    .font(.smapBodyEmphasis)
                    .foregroundStyle(Color.smapText)
            }
            ForEach(report.flaggedBooks) { book in
                VStack(alignment: .leading, spacing: 2) {
                    Text(book.title)
                        .font(.smapBody)
                        .foregroundStyle(Color.smapText)
                        .lineLimit(1)
                    if let reason = book.reason, !reason.isEmpty {
                        Text(reason)
                            .font(.smapCaption)
                            .foregroundStyle(Color.smapMuted)
                            .lineLimit(2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 4)
            }
        }
    }

    private func sectionLabel(_ s: String) -> some View {
        Text(s)
            .font(.smapCaption)
            .foregroundStyle(Color.smapMuted)
    }

    private func statTile(label: String, value: String, unit: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.smapCaption)
                .foregroundStyle(Color.smapMuted)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.smapHeading)
                    .foregroundStyle(Color.smapText)
                Text(unit)
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapMuted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color.smapBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
