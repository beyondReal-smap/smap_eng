import Foundation
import Observation

@Observable
@MainActor
final class WeeklyReportViewModel {
    private(set) var reports: [ParentalProfileReport] = []
    var isLoading: Bool = false
    var error: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: ParentalReportResponse = try await APIClient.shared.send(
                Endpoint(path: "/api/parents/report", method: .get),
            )
            self.reports = response.report
            self.error = nil
        } catch {
            self.error = "리포트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
        }
    }
}
