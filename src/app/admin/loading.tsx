export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
        <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 h-7 w-48 animate-pulse rounded-full bg-muted" />
        <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
