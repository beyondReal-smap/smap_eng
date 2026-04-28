/**
 * 섹션 구분용 헤딩.
 * eyebrow(짧은 레이블) + title + 선택 설명 + 선택 우측 액션.
 *
 * 섹션 앵커는 "eyebrow + title" 타이포만으로 충분하며
 * 장식 bar나 그라데이션은 사용하지 않는다(탈AI 원칙 + 섹션 간 일관성).
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-0.5 text-lg font-bold tracking-tight sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
