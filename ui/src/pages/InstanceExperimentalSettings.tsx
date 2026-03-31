import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";

export function InstanceExperimentalSettings() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: "인스턴스 설정" },
      { label: "실험실" },
    ]);
  }, [setBreadcrumbs]);

  const experimentalQuery = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });

  const toggleMutation = useMutation({
    mutationFn: async (patch: { enableIsolatedWorkspaces?: boolean; autoRestartDevServerWhenIdle?: boolean }) =>
      instanceSettingsApi.updateExperimental(patch),
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.instance.experimentalSettings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.health }),
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "실험 설정을 업데이트하지 못했습니다.");
    },
  });

  if (experimentalQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">실험 설정을 불러오는 중...</div>;
  }

  if (experimentalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {experimentalQuery.error instanceof Error
          ? experimentalQuery.error.message
          : "실험 설정을 불러오지 못했습니다."}
      </div>
    );
  }

  const enableIsolatedWorkspaces = experimentalQuery.data?.enableIsolatedWorkspaces === true;
  const autoRestartDevServerWhenIdle = experimentalQuery.data?.autoRestartDevServerWhenIdle === true;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">실험실</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          아직 기본 동작으로 확정되기 전에 평가 중인 기능을 미리 켤 수 있습니다.
        </p>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">격리된 워크스페이스 사용</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              프로젝트 설정에 실행 워크스페이스 제어를 표시하고, 새 이슈 실행과 기존 이슈 실행 모두에서
              격리 워크스페이스 동작을 허용합니다.
            </p>
          </div>
          <button
            type="button"
            data-slot="toggle"
            aria-label="격리 워크스페이스 실험 설정 전환"
            disabled={toggleMutation.isPending}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              enableIsolatedWorkspaces ? "bg-green-600" : "bg-muted",
            )}
            onClick={() => toggleMutation.mutate({ enableIsolatedWorkspaces: !enableIsolatedWorkspaces })}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                enableIsolatedWorkspaces ? "translate-x-4.5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">유휴 시 개발 서버 자동 재시작</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              `pnpm dev:once`에서 대기 중이거나 실행 중인 로컬 에이전트 작업이 모두 끝나면, 백엔드 변경이나
              마이그레이션으로 현재 부팅 상태가 오래되었을 때 서버를 자동으로 다시 시작합니다.
            </p>
          </div>
          <button
            type="button"
            data-slot="toggle"
            aria-label="보호된 개발 서버 자동 재시작 전환"
            disabled={toggleMutation.isPending}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              autoRestartDevServerWhenIdle ? "bg-green-600" : "bg-muted",
            )}
            onClick={() =>
              toggleMutation.mutate({ autoRestartDevServerWhenIdle: !autoRestartDevServerWhenIdle })
            }
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                autoRestartDevServerWhenIdle ? "translate-x-4.5" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
