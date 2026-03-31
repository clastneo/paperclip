import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, CircleDot, DollarSign, LayoutDashboard, PauseCircle, ShieldCheck } from "lucide-react";
import type { Agent, Issue } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { PluginSlotOutlet } from "@/plugins/slots";
import { activityApi } from "../api/activity";
import { agentsApi } from "../api/agents";
import { dashboardApi } from "../api/dashboard";
import { heartbeatsApi } from "../api/heartbeats";
import { issuesApi } from "../api/issues";
import { projectsApi } from "../api/projects";
import { ChartCard, IssueStatusChart, PriorityChart, RunActivityChart, SuccessRateChart } from "../components/ActivityCharts";
import { ActivityRow } from "../components/ActivityRow";
import { ActiveAgentsPanel } from "../components/ActiveAgentsPanel";
import { EmptyState } from "../components/EmptyState";
import { Identity } from "../components/Identity";
import { MetricCard } from "../components/MetricCard";
import { PageSkeleton } from "../components/PageSkeleton";
import { StatusIcon } from "../components/StatusIcon";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { useDialog } from "../context/DialogContext";
import { queryKeys } from "../lib/queryKeys";
import { timeAgo } from "../lib/timeAgo";
import { formatCents } from "../lib/utils";

function getRecentIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function Dashboard() {
  const { selectedCompanyId, companies } = useCompany();
  const { openOnboarding } = useDialog();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [animatedActivityIds, setAnimatedActivityIds] = useState<Set<string>>(new Set());
  const seenActivityIdsRef = useRef<Set<string>>(new Set());
  const hydratedActivityRef = useRef(false);
  const activityAnimationTimersRef = useRef<number[]>([]);

  useEffect(() => {
    setBreadcrumbs([{ label: "대시보드" }]);
  }, [setBreadcrumbs]);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard(selectedCompanyId!),
    queryFn: () => dashboardApi.summary(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: activity } = useQuery({
    queryKey: queryKeys.activity(selectedCompanyId!),
    queryFn: () => activityApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: runs } = useQuery({
    queryKey: queryKeys.heartbeats(selectedCompanyId!),
    queryFn: () => heartbeatsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const recentIssues = issues ? getRecentIssues(issues) : [];
  const recentActivity = useMemo(() => (activity ?? []).slice(0, 10), [activity]);

  useEffect(() => {
    for (const timer of activityAnimationTimersRef.current) {
      window.clearTimeout(timer);
    }
    activityAnimationTimersRef.current = [];
    seenActivityIdsRef.current = new Set();
    hydratedActivityRef.current = false;
    setAnimatedActivityIds(new Set());
  }, [selectedCompanyId]);

  useEffect(() => {
    if (recentActivity.length === 0) return;

    const seen = seenActivityIdsRef.current;
    const currentIds = recentActivity.map((event) => event.id);

    if (!hydratedActivityRef.current) {
      for (const id of currentIds) seen.add(id);
      hydratedActivityRef.current = true;
      return;
    }

    const newIds = currentIds.filter((id) => !seen.has(id));
    if (newIds.length === 0) {
      for (const id of currentIds) seen.add(id);
      return;
    }

    setAnimatedActivityIds((prev) => {
      const next = new Set(prev);
      for (const id of newIds) next.add(id);
      return next;
    });

    for (const id of newIds) seen.add(id);

    const timer = window.setTimeout(() => {
      setAnimatedActivityIds((prev) => {
        const next = new Set(prev);
        for (const id of newIds) next.delete(id);
        return next;
      });
      activityAnimationTimersRef.current = activityAnimationTimersRef.current.filter((value) => value !== timer);
    }, 980);

    activityAnimationTimersRef.current.push(timer);
  }, [recentActivity]);

  useEffect(() => {
    return () => {
      for (const timer of activityAnimationTimersRef.current) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const agent of agents ?? []) map.set(agent.id, agent);
    return map;
  }, [agents]);

  const entityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const issue of issues ?? []) map.set(`issue:${issue.id}`, issue.identifier ?? issue.id.slice(0, 8));
    for (const agent of agents ?? []) map.set(`agent:${agent.id}`, agent.name);
    for (const project of projects ?? []) map.set(`project:${project.id}`, project.name);
    return map;
  }, [issues, agents, projects]);

  const entityTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const issue of issues ?? []) map.set(`issue:${issue.id}`, issue.title);
    return map;
  }, [issues]);

  const agentName = (id: string | null) => {
    if (!id || !agents) return null;
    return agents.find((agent) => agent.id === id)?.name ?? null;
  };

  if (!selectedCompanyId) {
    if (companies.length === 0) {
      return (
        <EmptyState
          icon={LayoutDashboard}
          message="Paperclip를 시작할 준비가 되었습니다. 첫 회사를 만들고 에이전트를 설정해 보세요."
          action="시작하기"
          onAction={openOnboarding}
        />
      );
    }

    return <EmptyState icon={LayoutDashboard} message="대시보드를 보려면 회사를 만들거나 선택하세요." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  const hasNoAgents = agents !== undefined && agents.length === 0;

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      {hasNoAgents ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-950/60">
          <div className="flex items-center gap-2.5">
            <Bot className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-900 dark:text-amber-100">등록된 에이전트가 없습니다.</p>
          </div>
          <button
            onClick={() => openOnboarding({ initialStep: 2, companyId: selectedCompanyId })}
            className="shrink-0 text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          >
            지금 만들기
          </button>
        </div>
      ) : null}

      <ActiveAgentsPanel companyId={selectedCompanyId} />

      {data ? (
        <>
          {data.budgets.activeIncidents > 0 ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/20 bg-[linear-gradient(180deg,rgba(255,80,80,0.12),rgba(255,255,255,0.02))] px-4 py-3">
              <div className="flex items-start gap-2.5">
                <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <div>
                  <p className="text-sm font-medium text-red-50">활성 예산 사고 {data.budgets.activeIncidents}건</p>
                  <p className="text-xs text-red-100/70">
                    에이전트 {data.budgets.pausedAgents}명 일시 중지, 프로젝트 {data.budgets.pausedProjects}개 일시 중지,
                    예산 승인 {data.budgets.pendingApprovals}건 대기 중
                  </p>
                </div>
              </div>
              <Link to="/costs" className="text-sm text-red-100 underline underline-offset-2">
                예산 보기
              </Link>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-1 sm:gap-2 xl:grid-cols-4">
            <MetricCard
              icon={Bot}
              value={data.agents.active + data.agents.running + data.agents.paused + data.agents.error}
              label="활성 에이전트"
              to="/agents"
              description={
                <span>
                  실행 중 {data.agents.running}명 · 일시 중지 {data.agents.paused}명 · 오류 {data.agents.error}명
                </span>
              }
            />
            <MetricCard
              icon={CircleDot}
              value={data.tasks.inProgress}
              label="진행 중 작업"
              to="/issues"
              description={
                <span>
                  열림 {data.tasks.open}건 · 차단 {data.tasks.blocked}건
                </span>
              }
            />
            <MetricCard
              icon={DollarSign}
              value={formatCents(data.costs.monthSpendCents)}
              label="이번 달 사용액"
              to="/costs"
              description={
                <span>
                  {data.costs.monthBudgetCents > 0
                    ? `예산 ${formatCents(data.costs.monthBudgetCents)} 중 ${data.costs.monthUtilizationPercent}% 사용`
                    : "예산 제한 없음"}
                </span>
              }
            />
            <MetricCard
              icon={ShieldCheck}
              value={data.pendingApprovals + data.budgets.pendingApprovals}
              label="대기 중 승인"
              to="/approvals"
              description={
                <span>
                  {data.budgets.pendingApprovals > 0
                    ? `예산 초과 승인 ${data.budgets.pendingApprovals}건 검토 대기`
                    : "보드 검토 대기 중"}
                </span>
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ChartCard title="실행 활동" subtitle="최근 14일">
              <RunActivityChart runs={runs ?? []} />
            </ChartCard>
            <ChartCard title="우선순위 분포" subtitle="최근 14일">
              <PriorityChart issues={issues ?? []} />
            </ChartCard>
            <ChartCard title="상태 분포" subtitle="최근 14일">
              <IssueStatusChart issues={issues ?? []} />
            </ChartCard>
            <ChartCard title="성공률" subtitle="최근 14일">
              <SuccessRateChart runs={runs ?? []} />
            </ChartCard>
          </div>

          <PluginSlotOutlet
            slotTypes={["dashboardWidget"]}
            context={{ companyId: selectedCompanyId }}
            className="grid gap-4 md:grid-cols-2"
            itemClassName="rounded-lg border bg-card p-4 shadow-sm"
          />

          <div className="grid gap-4 md:grid-cols-2">
            {recentActivity.length > 0 ? (
              <div className="min-w-0">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">최근 활동</h3>
                <div className="divide-y divide-border overflow-hidden border border-border">
                  {recentActivity.map((event) => (
                    <ActivityRow
                      key={event.id}
                      event={event}
                      agentMap={agentMap}
                      entityNameMap={entityNameMap}
                      entityTitleMap={entityTitleMap}
                      className={animatedActivityIds.has(event.id) ? "activity-row-enter" : undefined}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="min-w-0">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">최근 작업</h3>
              {recentIssues.length === 0 ? (
                <div className="border border-border p-4">
                  <p className="text-sm text-muted-foreground">아직 작업이 없습니다.</p>
                </div>
              ) : (
                <div className="divide-y divide-border overflow-hidden border border-border">
                  {recentIssues.slice(0, 10).map((issue) => (
                    <Link
                      key={issue.id}
                      to={`/issues/${issue.identifier ?? issue.id}`}
                      className="block cursor-pointer px-4 py-3 text-inherit no-underline transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-start gap-2 sm:items-center sm:gap-3">
                        <span className="shrink-0 sm:hidden">
                          <StatusIcon status={issue.status} />
                        </span>

                        <span className="flex min-w-0 flex-1 flex-col gap-1 sm:contents">
                          <span className="line-clamp-2 text-sm sm:order-2 sm:min-w-0 sm:flex-1 sm:truncate sm:line-clamp-none">
                            {issue.title}
                          </span>
                          <span className="flex items-center gap-2 sm:order-1 sm:shrink-0">
                            <span className="hidden sm:inline-flex">
                              <StatusIcon status={issue.status} />
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {issue.identifier ?? issue.id.slice(0, 8)}
                            </span>
                            {issue.assigneeAgentId
                              ? (() => {
                                  const name = agentName(issue.assigneeAgentId);
                                  return name ? (
                                    <span className="hidden sm:inline-flex">
                                      <Identity name={name} size="sm" />
                                    </span>
                                  ) : null;
                                })()
                              : null}
                            <span className="text-xs text-muted-foreground sm:hidden">&middot;</span>
                            <span className="shrink-0 text-xs text-muted-foreground sm:order-last">
                              {timeAgo(issue.updatedAt)}
                            </span>
                          </span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
