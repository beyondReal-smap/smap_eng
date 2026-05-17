import Foundation
import OSLog

/// 앱 전역 OSLog 카테고리 모음. 모든 모듈은 print 대신 이 enum 의 logger 를 사용한다.
///
/// 사용처:
///   AppLog.push.warning("register failed: \(error.localizedDescription, privacy: .public)")
///
/// Console.app / sysdiagnose 에서 subsystem=com.smap.harubook 으로 한 번에 필터하고,
/// category 로 책임 영역(push/vocab/audio/...) 별로 좁혀 본다.
enum AppLog {
    private static let subsystem = "com.smap.harubook"

    /// APNs 등록/해제 — PushManager / HaruBookAppDelegate.
    static let push = Logger(subsystem: subsystem, category: "push")

    /// 단어장 TTS / SRS 동작 — VocabViewModel.
    static let vocab = Logger(subsystem: subsystem, category: "vocab")
}
