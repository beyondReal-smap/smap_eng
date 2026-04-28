import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * "또는 이메일로 계속하기" 류의 구분선.
 * 양쪽 라인 + 중앙 문구.
 */
export function AuthDivider({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="separator"
      aria-label={typeof children === "string" ? children : undefined}
      className={cn("flex items-center gap-3", className)}
    >
      <Separator className="flex-1" />
      <span className="text-xs font-medium text-muted-foreground">
        {children}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}
