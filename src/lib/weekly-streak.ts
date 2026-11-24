// 이번 주(월~일) 학습 도장·연속 학습일 계산 — iOS `WeeklyStreak`과 같은 규칙.
// activeDays는 서버 학습 요약의 activeDaysThisWeek ∪ activeDaysThisMonth(YYYY-MM-DD).

export interface WeekDay {
  /** YYYY-MM-DD */
  key: string;
  weekdayLabel: string;
  isActive: boolean;
  isToday: boolean;
}

export interface WeeklyStreak {
  days: WeekDay[];
  /** 표시된 월~일 중 학습한 날 수. */
  activeCount: number;
  /** 끊기지 않은 연속 학습일 수. 오늘 읽었으면 오늘부터, 아직이면 어제부터 거슬러 센다. */
  streak: number;
}

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

/** 기기 현지 날짜 기준 YYYY-MM-DD. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function weeklyStreak(activeDays: ReadonlySet<string>, today: Date = new Date()): WeeklyStreak {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // getDay(): 0=일 … 6=토 → 월요일 시작으로 환산.
  const monday = addDays(startOfToday, -((startOfToday.getDay() + 6) % 7));
  const todayKey = localDayKey(startOfToday);

  const days = WEEKDAY_LABELS.map((label, offset) => {
    const key = localDayKey(addDays(monday, offset));
    return { key, weekdayLabel: label, isActive: activeDays.has(key), isToday: key === todayKey };
  });

  let cursor = activeDays.has(todayKey) ? startOfToday : addDays(startOfToday, -1);
  let streak = 0;
  while (activeDays.has(localDayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return { days, activeCount: days.filter((d) => d.isActive).length, streak };
}
