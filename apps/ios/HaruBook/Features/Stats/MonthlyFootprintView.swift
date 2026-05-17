import SwiftUI

/// 월간 학습 흔적 그리드 — 해당 월의 일자별 활동 여부를 시각화.
///
/// `activeDays`: YYYY-MM-DD 정렬 배열.
/// `thisMonth`: YYYY-MM. 빈 문자열이면 현재 월로 폴백.
struct MonthlyFootprintView: View {
    let activeDays: [String]
    let thisMonth: String

    private let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.firstWeekday = 1 // Sunday
        return c
    }()

    var body: some View {
        let (year, month) = parseMonth()
        let activeSet = Set(activeDays)
        let daysInMonth = numberOfDays(year: year, month: month)
        let leadingBlanks = firstWeekdayOffset(year: year, month: month)
        let total = leadingBlanks + daysInMonth

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(String(format: "%04d년 %d월", year, month))
                    .font(.smapBodyEmphasis)
                    .foregroundStyle(Color.smapText)
                Spacer()
                Text("\(activeDays.count)일 학습")
                    .font(.smapCaption)
                    .foregroundStyle(Color.smapMuted)
            }

            HStack(spacing: 0) {
                ForEach(["일", "월", "화", "수", "목", "금", "토"], id: \.self) { d in
                    Text(d)
                        .font(.smapCaption)
                        .frame(maxWidth: .infinity)
                        .foregroundStyle(Color.smapMuted)
                }
            }

            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7),
                spacing: 6,
            ) {
                ForEach(0..<total, id: \.self) { idx in
                    if idx < leadingBlanks {
                        Color.clear.frame(height: 28)
                    } else {
                        let day = idx - leadingBlanks + 1
                        let key = ymd(year: year, month: month, day: day)
                        let active = activeSet.contains(key)
                        cell(day: day, active: active)
                    }
                }
            }
        }
        .padding(16)
        .background(Color.smapSurface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.smapBorder, lineWidth: 1),
        )
    }

    private func cell(day: Int, active: Bool) -> some View {
        Text("\(day)")
            .font(.system(size: 12, weight: .medium, design: .rounded))
            .frame(maxWidth: .infinity, minHeight: 28)
            .background(active ? Color.smapPrimary : Color.smapPrimarySoft.opacity(0.4))
            // active: 코랄 fill 위 흰 텍스트는 WCAG 1.7:1 미달 → deep coral ink로 교정.
            .foregroundStyle(active ? Color.smapPrimaryForeground : Color.smapMuted)
            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
    }

    // MARK: - Date helpers

    private func parseMonth() -> (year: Int, month: Int) {
        let parts = thisMonth.split(separator: "-")
        if parts.count == 2, let y = Int(parts[0]), let m = Int(parts[1]) {
            return (y, m)
        }
        let now = Date()
        return (
            calendar.component(.year, from: now),
            calendar.component(.month, from: now),
        )
    }

    private func numberOfDays(year: Int, month: Int) -> Int {
        var components = DateComponents()
        components.year = year
        components.month = month
        guard let date = calendar.date(from: components),
              let range = calendar.range(of: .day, in: .month, for: date)
        else { return 30 }
        return range.count
    }

    private func firstWeekdayOffset(year: Int, month: Int) -> Int {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = 1
        guard let date = calendar.date(from: components) else { return 0 }
        // calendar.firstWeekday = 1(Sunday)이면 weekday 1=Sun. 오프셋 = weekday - 1.
        return calendar.component(.weekday, from: date) - 1
    }

    private func ymd(year: Int, month: Int, day: Int) -> String {
        String(format: "%04d-%02d-%02d", year, month, day)
    }
}
