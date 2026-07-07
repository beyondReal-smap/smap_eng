import Foundation

/// 포인트·배지 보상 규칙 — 웹 `src/lib/rewards.ts` 미러 (iOS/AOS 패리티, 단일 소스).
///
/// 저장소 없는 "파생 집계" 방식: 포인트는 서버 집계값(LearningSummary)의 순수 함수다.
/// 원장(ledger)이 없으므로 멱등성이 자동 보장되고, 규칙값을 바꾸면 과거 기록에도 소급된다.
///
/// 톤 원칙(웹 learning-summary와 동일한 "압박 없는" 철학):
/// 획득한 것만 축하한다. "N점 더 모으면" 같은 결핍 프레이밍 금지.
enum Rewards {
    /// 이벤트별 포인트 규칙값. 파생 집계라 값 변경 시 누적 포인트도 함께 재계산된다.
    enum Points {
        /// 완독 세션 1회 (reading_logs.finishedAt 존재)
        static let finishSession = 10
        /// 퀴즈 만점 1회 (quizScore == 5)
        static let perfectQuiz = 20
        /// 단어 마스터 1개 (vocab_progress.level >= 3)
        static let masteredWord = 5
    }

    static func computePoints(_ s: RewardStats) -> Int {
        s.totalFinishedSessions * Points.finishSession
            + s.totalPerfectScores * Points.perfectQuiz
            + s.masteredWords * Points.masteredWord
    }

    /// 퀴즈 제출 직후 결과 화면에 보여줄 "이번 세션" 획득 포인트.
    static func sessionPoints(isPerfect: Bool) -> Int {
        Points.finishSession + (isPerfect ? Points.perfectQuiz : 0)
    }

    /// 배지 정의 — 달성 조건이 낮은 것부터. 전부 "이미 이룬 것"만 표시한다.
    /// 이모지·타이틀·설명 문구는 웹 rewards.ts와 동일하게 유지할 것.
    static let badges: [BadgeDef] = [
        BadgeDef(
            id: "first-book",
            emoji: "🌱",
            title: "첫 걸음",
            description: "첫 번째 책을 끝까지 읽었어요",
            earned: { $0.totalBooksRead >= 1 },
        ),
        BadgeDef(
            id: "bookworm",
            emoji: "📚",
            title: "책벌레",
            description: "책 5권을 완독했어요",
            earned: { $0.totalBooksRead >= 5 },
        ),
        BadgeDef(
            id: "first-perfect",
            emoji: "🏆",
            title: "퍼펙트",
            description: "퀴즈 만점을 처음 받았어요",
            earned: { $0.totalPerfectScores >= 1 },
        ),
        BadgeDef(
            id: "quiz-master",
            emoji: "🌟",
            title: "퀴즈 마스터",
            description: "퀴즈 만점을 3번 받았어요",
            earned: { $0.totalPerfectScores >= 3 },
        ),
        BadgeDef(
            id: "word-collector",
            emoji: "🧠",
            title: "단어 수집가",
            description: "단어 10개를 마스터했어요",
            earned: { $0.masteredWords >= 10 },
        ),
        BadgeDef(
            id: "word-doctor",
            emoji: "💎",
            title: "단어 박사",
            description: "단어 50개를 마스터했어요",
            earned: { $0.masteredWords >= 50 },
        ),
    ]

    static func earnedBadges(_ s: RewardStats) -> [BadgeDef] {
        badges.filter { $0.earned(s) }
    }
}

/// 포인트·배지 판정에 필요한 집계 입력 — LearningSummary의 부분집합.
struct RewardStats: Sendable {
    /// 완독 세션 수 (재독 포함)
    let totalFinishedSessions: Int
    /// 퀴즈 만점 횟수
    let totalPerfectScores: Int
    /// 완독한 책 수 (distinct)
    let totalBooksRead: Int
    /// 마스터한 단어 수 (level >= 3)
    let masteredWords: Int
}

struct BadgeDef: Identifiable, Sendable {
    let id: String
    let emoji: String
    let title: String
    /// 달성 시점에 보여줄 축하 문구 — 결핍/압박 표현 금지.
    let description: String
    let earned: @Sendable (RewardStats) -> Bool
}

extension LearningSummary {
    /// 포인트·배지 판정 입력으로 변환. masteredWords는 구서버 응답에 없을 수 있어 0 폴백.
    var rewardStats: RewardStats {
        RewardStats(
            totalFinishedSessions: totalFinishedSessions,
            totalPerfectScores: totalPerfectScores,
            totalBooksRead: totalBooksRead,
            masteredWords: masteredWords ?? 0,
        )
    }
}
