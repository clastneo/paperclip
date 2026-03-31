import type { HeartbeatRun } from "@paperclipai/shared";
import { labelForKey } from "../lib/labels";

export function getLast14Days(): string[] {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    return date.toISOString().slice(0, 10);
  });
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function DateLabels({ days }: { days: string[] }) {
  return (
    <div className="mt-1.5 flex gap-[3px]">
      {days.map((day, index) => (
        <div key={day} className="flex-1 text-center">
          {index === 0 || index === 6 || index === 13 ? (
            <span className="text-[9px] tabular-nums text-muted-foreground">{formatDayLabel(day)}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-0.5">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {subtitle && <span className="text-[10px] text-muted-foreground/60">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

export function RunActivityChart({ runs }: { runs: HeartbeatRun[] }) {
  const days = getLast14Days();
  const grouped = new Map<string, { succeeded: number; failed: number; other: number }>();
  for (const day of days) grouped.set(day, { succeeded: 0, failed: 0, other: 0 });
  for (const run of runs) {
    const day = new Date(run.createdAt).toISOString().slice(0, 10);
    const entry = grouped.get(day);
    if (!entry) continue;
    if (run.status === "succeeded") entry.succeeded++;
    else if (run.status === "failed" || run.status === "timed_out") entry.failed++;
    else entry.other++;
  }

  const maxValue = Math.max(...Array.from(grouped.values()).map((value) => value.succeeded + value.failed + value.other), 1);
  const hasData = Array.from(grouped.values()).some((value) => value.succeeded + value.failed + value.other > 0);

  if (!hasData) return <p className="text-xs text-muted-foreground">아직 실행 기록이 없습니다.</p>;

  return (
    <div>
      <div className="flex h-20 items-end gap-[3px]">
        {days.map((day) => {
          const entry = grouped.get(day)!;
          const total = entry.succeeded + entry.failed + entry.other;
          const heightPct = (total / maxValue) * 100;
          return (
            <div key={day} className="flex h-full flex-1 flex-col justify-end" title={`${day}: ${total}회 실행`}>
              {total > 0 ? (
                <div className="flex flex-col-reverse gap-px overflow-hidden" style={{ height: `${heightPct}%`, minHeight: 2 }}>
                  {entry.succeeded > 0 && <div className="bg-emerald-500" style={{ flex: entry.succeeded }} />}
                  {entry.failed > 0 && <div className="bg-red-500" style={{ flex: entry.failed }} />}
                  {entry.other > 0 && <div className="bg-neutral-500" style={{ flex: entry.other }} />}
                </div>
              ) : (
                <div className="rounded-sm bg-muted/30" style={{ height: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <DateLabels days={days} />
    </div>
  );
}

const priorityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#6b7280",
};

const priorityOrder = ["critical", "high", "medium", "low"] as const;

export function PriorityChart({ issues }: { issues: { priority: string; createdAt: Date }[] }) {
  const days = getLast14Days();
  const grouped = new Map<string, Record<string, number>>();
  for (const day of days) grouped.set(day, { critical: 0, high: 0, medium: 0, low: 0 });
  for (const issue of issues) {
    const day = new Date(issue.createdAt).toISOString().slice(0, 10);
    const entry = grouped.get(day);
    if (!entry) continue;
    if (issue.priority in entry) entry[issue.priority]++;
  }

  const maxValue = Math.max(...Array.from(grouped.values()).map((value) => Object.values(value).reduce((a, b) => a + b, 0)), 1);
  const hasData = Array.from(grouped.values()).some((value) => Object.values(value).reduce((a, b) => a + b, 0) > 0);

  if (!hasData) return <p className="text-xs text-muted-foreground">아직 이슈가 없습니다.</p>;

  return (
    <div>
      <div className="flex h-20 items-end gap-[3px]">
        {days.map((day) => {
          const entry = grouped.get(day)!;
          const total = Object.values(entry).reduce((a, b) => a + b, 0);
          const heightPct = (total / maxValue) * 100;
          return (
            <div key={day} className="flex h-full flex-1 flex-col justify-end" title={`${day}: ${total}개 이슈`}>
              {total > 0 ? (
                <div className="flex flex-col-reverse gap-px overflow-hidden" style={{ height: `${heightPct}%`, minHeight: 2 }}>
                  {priorityOrder.map((priority) => entry[priority] > 0 ? (
                    <div key={priority} style={{ flex: entry[priority], backgroundColor: priorityColors[priority] }} />
                  ) : null)}
                </div>
              ) : (
                <div className="rounded-sm bg-muted/30" style={{ height: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <DateLabels days={days} />
      <ChartLegend items={priorityOrder.map((priority) => ({ color: priorityColors[priority], label: labelForKey(priority) }))} />
    </div>
  );
}

const statusColors: Record<string, string> = {
  todo: "#3b82f6",
  in_progress: "#8b5cf6",
  in_review: "#a855f7",
  done: "#10b981",
  blocked: "#ef4444",
  cancelled: "#6b7280",
  backlog: "#64748b",
};

const statusLabels: Record<string, string> = {
  todo: "할 일",
  in_progress: "진행 중",
  in_review: "검토 중",
  done: "완료",
  blocked: "차단됨",
  cancelled: "취소됨",
  backlog: "백로그",
};

export function IssueStatusChart({ issues }: { issues: { status: string; createdAt: Date }[] }) {
  const days = getLast14Days();
  const allStatuses = new Set<string>();
  const grouped = new Map<string, Record<string, number>>();
  for (const day of days) grouped.set(day, {});
  for (const issue of issues) {
    const day = new Date(issue.createdAt).toISOString().slice(0, 10);
    const entry = grouped.get(day);
    if (!entry) continue;
    entry[issue.status] = (entry[issue.status] ?? 0) + 1;
    allStatuses.add(issue.status);
  }

  const statusOrder = ["todo", "in_progress", "in_review", "done", "blocked", "cancelled", "backlog"].filter((status) => allStatuses.has(status));
  const maxValue = Math.max(...Array.from(grouped.values()).map((value) => Object.values(value).reduce((a, b) => a + b, 0)), 1);
  const hasData = allStatuses.size > 0;

  if (!hasData) return <p className="text-xs text-muted-foreground">아직 이슈가 없습니다.</p>;

  return (
    <div>
      <div className="flex h-20 items-end gap-[3px]">
        {days.map((day) => {
          const entry = grouped.get(day)!;
          const total = Object.values(entry).reduce((a, b) => a + b, 0);
          const heightPct = (total / maxValue) * 100;
          return (
            <div key={day} className="flex h-full flex-1 flex-col justify-end" title={`${day}: ${total}개 이슈`}>
              {total > 0 ? (
                <div className="flex flex-col-reverse gap-px overflow-hidden" style={{ height: `${heightPct}%`, minHeight: 2 }}>
                  {statusOrder.map((status) => (entry[status] ?? 0) > 0 ? (
                    <div key={status} style={{ flex: entry[status], backgroundColor: statusColors[status] ?? "#6b7280" }} />
                  ) : null)}
                </div>
              ) : (
                <div className="rounded-sm bg-muted/30" style={{ height: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <DateLabels days={days} />
      <ChartLegend items={statusOrder.map((status) => ({ color: statusColors[status] ?? "#6b7280", label: statusLabels[status] ?? labelForKey(status) }))} />
    </div>
  );
}

export function SuccessRateChart({ runs }: { runs: HeartbeatRun[] }) {
  const days = getLast14Days();
  const grouped = new Map<string, { succeeded: number; total: number }>();
  for (const day of days) grouped.set(day, { succeeded: 0, total: 0 });
  for (const run of runs) {
    const day = new Date(run.createdAt).toISOString().slice(0, 10);
    const entry = grouped.get(day);
    if (!entry) continue;
    entry.total++;
    if (run.status === "succeeded") entry.succeeded++;
  }

  const hasData = Array.from(grouped.values()).some((value) => value.total > 0);
  if (!hasData) return <p className="text-xs text-muted-foreground">아직 실행 기록이 없습니다.</p>;

  return (
    <div>
      <div className="flex h-20 items-end gap-[3px]">
        {days.map((day) => {
          const entry = grouped.get(day)!;
          const rate = entry.total > 0 ? entry.succeeded / entry.total : 0;
          const color = entry.total === 0 ? undefined : rate >= 0.8 ? "#10b981" : rate >= 0.5 ? "#eab308" : "#ef4444";
          return (
            <div key={day} className="flex h-full flex-1 flex-col justify-end" title={`${day}: ${entry.total > 0 ? Math.round(rate * 100) : 0}% (${entry.succeeded}/${entry.total})`}>
              {entry.total > 0 ? (
                <div style={{ height: `${rate * 100}%`, minHeight: 2, backgroundColor: color }} />
              ) : (
                <div className="rounded-sm bg-muted/30" style={{ height: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <DateLabels days={days} />
    </div>
  );
}
