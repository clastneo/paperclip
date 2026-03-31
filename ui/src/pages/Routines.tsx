import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { ChevronDown, ChevronRight, MoreHorizontal, Play, Plus, Repeat } from "lucide-react";
import { routinesApi } from "../api/routines";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToast } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { getRecentAssigneeIds, sortAgentsByRecency, trackRecentAssignee } from "../lib/recent-assignees";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { AgentIcon } from "../components/AgentIconPicker";
import { InlineEntitySelector, type InlineEntityOption } from "../components/InlineEntitySelector";
import { MarkdownEditor, type MarkdownEditorRef } from "../components/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const concurrencyPolicies = ["coalesce_if_active", "always_enqueue", "skip_if_active"];
const catchUpPolicies = ["skip_missed", "enqueue_missed_with_cap"];
const concurrencyPolicyDescriptions: Record<string, string> = {
  coalesce_if_active: "?ㅽ뻾???대? 吏꾪뻾 以묒씠硫??꾩냽 ?ㅽ뻾? ?섎굹留??湲곗뿴???좎??⑸땲??",
  always_enqueue: "猷⑦떞???대? ?ㅽ뻾 以묒씠?대룄 紐⑤뱺 ?몃━嫄?諛쒖깮???湲곗뿴???ｌ뒿?덈떎.",
  skip_if_active: "?ㅽ뻾??吏꾪뻾 以묒씤 ?숈븞 ?ㅼ뼱?????몃━嫄곕뒗 踰꾨┰?덈떎.",
};
const catchUpPolicyDescriptions: Record<string, string> = {
  skip_missed: "?ㅼ?以꾨윭??猷⑦떞??硫덉떠 ?덈뒗 ?숈븞 ?볦튇 援ш컙? 臾댁떆?⑸땲??",
  enqueue_missed_with_cap: "蹂듦뎄 ???볦튇 ?ㅼ?以?援ш컙???쒗븳??諛곗튂濡??곕씪?≪뒿?덈떎.",
};

function autoResizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function formatLastRunTimestamp(value: Date | string | null | undefined) {
  if (!value) return "?놁쓬";
  return new Date(value).toLocaleString("ko-KR");
}

function nextRoutineStatus(currentStatus: string, enabled: boolean) {
  if (currentStatus === "archived" && enabled) return "active";
  return enabled ? "active" : "paused";
}

export function Routines() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const descriptionEditorRef = useRef<MarkdownEditorRef>(null);
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const assigneeSelectorRef = useRef<HTMLButtonElement | null>(null);
  const projectSelectorRef = useRef<HTMLButtonElement | null>(null);
  const [runningRoutineId, setRunningRoutineId] = useState<string | null>(null);
  const [statusMutationRoutineId, setStatusMutationRoutineId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    projectId: "",
    assigneeAgentId: "",
    priority: "medium",
    concurrencyPolicy: "coalesce_if_active",
    catchUpPolicy: "skip_missed",
  });

  useEffect(() => {
    setBreadcrumbs([{ label: "猷⑦떞" }]);
  }, [setBreadcrumbs]);

  const { data: routines, isLoading, error } = useQuery({
    queryKey: queryKeys.routines.list(selectedCompanyId!),
    queryFn: () => routinesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    autoResizeTextarea(titleInputRef.current);
  }, [draft.title, composerOpen]);

  const createRoutine = useMutation({
    mutationFn: () =>
      routinesApi.create(selectedCompanyId!, {
        ...draft,
        description: draft.description.trim() || null,
      }),
    onSuccess: async (routine) => {
      setDraft({
        title: "",
        description: "",
        projectId: "",
        assigneeAgentId: "",
        priority: "medium",
        concurrencyPolicy: "coalesce_if_active",
        catchUpPolicy: "skip_missed",
      });
      setComposerOpen(false);
      setAdvancedOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.routines.list(selectedCompanyId!) });
      pushToast({
        title: "猷⑦떞??留뚮뱾?덉뒿?덈떎",
        body: "泥?踰덉㎏ ?몃━嫄곕? 異붽????ㅼ젣 ?뚰겕?뚮줈濡??꾪솚?섏꽭??",
        tone: "success",
      });
      navigate(`/routines/${routine.id}?tab=triggers`);
    },
  });

  const updateRoutineStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => routinesApi.update(id, { status }),
    onMutate: ({ id }) => {
      setStatusMutationRoutineId(id);
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.routines.list(selectedCompanyId!) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.routines.detail(variables.id) }),
      ]);
    },
    onSettled: () => {
      setStatusMutationRoutineId(null);
    },
    onError: (mutationError) => {
      pushToast({
        title: "猷⑦떞???낅뜲?댄듃?섏? 紐삵뻽?듬땲??,
        body: mutationError instanceof Error ? mutationError.message : "Paperclip媛 猷⑦떞???낅뜲?댄듃?섏? 紐삵뻽?듬땲??",
        tone: "error",
      });
    },
  });

  const runRoutine = useMutation({
    mutationFn: (id: string) => routinesApi.run(id),
    onMutate: (id) => {
      setRunningRoutineId(id);
    },
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.routines.list(selectedCompanyId!) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.routines.detail(id) }),
      ]);
    },
    onSettled: () => {
      setRunningRoutineId(null);
    },
    onError: (mutationError) => {
      pushToast({
        title: "猷⑦떞 ?ㅽ뻾???쒖옉?섏? 紐삵뻽?듬땲??,
        body: mutationError instanceof Error ? mutationError.message : "Paperclip媛 猷⑦떞 ?ㅽ뻾???쒖옉?섏? 紐삵뻽?듬땲??",
        tone: "error",
      });
    },
  });

  const recentAssigneeIds = useMemo(() => getRecentAssigneeIds(), [composerOpen]);
  const assigneeOptions = useMemo<InlineEntityOption[]>(
    () =>
      sortAgentsByRecency(
        (agents ?? []).filter((agent) => agent.status !== "terminated"),
        recentAssigneeIds,
      ).map((agent) => ({
        id: agent.id,
        label: agent.name,
        searchText: `${agent.name} ${agent.role} ${agent.title ?? ""}`,
      })),
    [agents, recentAssigneeIds],
  );
  const projectOptions = useMemo<InlineEntityOption[]>(
    () =>
      (projects ?? []).map((project) => ({
        id: project.id,
        label: project.name,
        searchText: project.description ?? "",
      })),
    [projects],
  );
  const agentById = useMemo(
    () => new Map((agents ?? []).map((agent) => [agent.id, agent])),
    [agents],
  );
  const projectById = useMemo(
    () => new Map((projects ?? []).map((project) => [project.id, project])),
    [projects],
  );
  const currentAssignee = draft.assigneeAgentId ? agentById.get(draft.assigneeAgentId) ?? null : null;
  const currentProject = draft.projectId ? projectById.get(draft.projectId) ?? null : null;

  if (!selectedCompanyId) {
    return <EmptyState icon={Repeat} message="猷⑦떞??蹂대젮硫??뚯궗瑜??좏깮?섏꽭??" />;
  }

  if (isLoading) {
    return <PageSkeleton variant="issues-list" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            猷⑦떞
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Beta</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            諛섎났 ?묒뾽 ?뺤쓽瑜?留뚮뱾怨? 異붿쟻 媛?ν븳 ?ㅽ뻾 ?댁뒋濡?援ъ껜?뷀빀?덈떎.
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          猷⑦떞 留뚮뱾湲?        </Button>
      </div>

      <Dialog
        open={composerOpen}
        onOpenChange={(open) => {
          if (!createRoutine.isPending) {
            setComposerOpen(open);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0"
        >
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">??猷⑦떞</p>
              <p className="text-sm text-muted-foreground">
                癒쇱? 諛섎났 ?묒뾽???뺤쓽?섏꽭?? ?몃━嫄??ㅼ젙? ?곸꽭 ?섏씠吏?먯꽌 ?댁뼱吏묐땲??
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setComposerOpen(false);
                setAdvancedOpen(false);
              }}
              disabled={createRoutine.isPending}
            >
              痍⑥냼
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-5 pt-5 pb-3">
              <textarea
                ref={titleInputRef}
                className="w-full resize-none overflow-hidden bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground/50"
                placeholder="猷⑦떞 ?쒕ぉ"
                rows={1}
                value={draft.title}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, title: event.target.value }));
                  autoResizeTextarea(event.target);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    descriptionEditorRef.current?.focus();
                    return;
                  }
                  if (event.key === "Tab" && !event.shiftKey) {
                    event.preventDefault();
                    if (draft.assigneeAgentId) {
                      if (draft.projectId) {
                        descriptionEditorRef.current?.focus();
                      } else {
                        projectSelectorRef.current?.focus();
                      }
                    } else {
                      assigneeSelectorRef.current?.focus();
                    }
                  }
                }}
                autoFocus
              />
            </div>

            <div className="px-5 pb-3">
              <div className="overflow-x-auto overscroll-x-contain">
                <div className="inline-flex min-w-full flex-wrap items-center gap-2 text-sm text-muted-foreground sm:min-w-max sm:flex-nowrap">
                  <span>?대떦</span>
                  <InlineEntitySelector
                    ref={assigneeSelectorRef}
                    value={draft.assigneeAgentId}
                    options={assigneeOptions}
                    placeholder="?대떦??
                    noneLabel="?대떦???놁쓬"
                    searchPlaceholder="?대떦??寃??.."
                    emptyMessage="?대떦?먮? 李얠? 紐삵뻽?듬땲??"
                    onChange={(assigneeAgentId) => {
                      if (assigneeAgentId) trackRecentAssignee(assigneeAgentId);
                      setDraft((current) => ({ ...current, assigneeAgentId }));
                    }}
                    onConfirm={() => {
                      if (draft.projectId) {
                        descriptionEditorRef.current?.focus();
                      } else {
                        projectSelectorRef.current?.focus();
                      }
                    }}
                    renderTriggerValue={(option) =>
                      option ? (
                        currentAssignee ? (
                          <>
                            <AgentIcon icon={currentAssignee.icon} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{option.label}</span>
                          </>
                        ) : (
                          <span className="truncate">{option.label}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">?대떦없음</span>
                      )
                    }
                    renderOption={(option) => {
                      if (!option.id) return <span className="truncate">{option.label}</span>;
                      const assignee = agentById.get(option.id);
                      return (
                        <>
                          {assignee ? <AgentIcon icon={assignee.icon} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
                          <span className="truncate">{option.label}</span>
                        </>
                      );
                    }}
                  />
                  <span>?꾨줈?앺듃</span>
                  <InlineEntitySelector
                    ref={projectSelectorRef}
                    value={draft.projectId}
                    options={projectOptions}
                    placeholder="?꾨줈?앺듃"
                    noneLabel="?꾨줈?앺듃 ?놁쓬"
                    searchPlaceholder="?꾨줈?앺듃 寃??.."
                    emptyMessage="?꾨줈?앺듃瑜?李얠? 紐삵뻽?듬땲??"
                    onChange={(projectId) => setDraft((current) => ({ ...current, projectId }))}
                    onConfirm={() => descriptionEditorRef.current?.focus()}
                    renderTriggerValue={(option) =>
                      option && currentProject ? (
                        <>
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: currentProject.color ?? "#64748b" }}
                          />
                          <span className="truncate">{option.label}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">?꾨줈?앺듃</span>
                      )
                    }
                    renderOption={(option) => {
                      if (!option.id) return <span className="truncate">{option.label}</span>;
                      const project = projectById.get(option.id);
                      return (
                        <>
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: project?.color ?? "#64748b" }}
                          />
                          <span className="truncate">{option.label}</span>
                        </>
                      );
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border/60 px-5 py-4">
              <MarkdownEditor
                ref={descriptionEditorRef}
                value={draft.description}
                onChange={(description) => setDraft((current) => ({ ...current, description }))}
                placeholder="吏移⑥쓣 ?낅젰?섏꽭??.."
                bordered={false}
                contentClassName="min-h-[160px] text-sm text-muted-foreground"
                onSubmit={() => {
                  if (!createRoutine.isPending && draft.title.trim() && draft.projectId && draft.assigneeAgentId) {
                    createRoutine.mutate();
                  }
                }}
              />
            </div>

            <div className="border-t border-border/60 px-5 py-3">
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
                  <div>
                    <p className="text-sm font-medium">怨좉툒 ?꾨떖 ?ㅼ젙</p>
                    <p className="text-sm text-muted-foreground">?뺤콉 ?쒖뼱???묒뾽 ?뺤쓽蹂대떎 ?ㅼ뿉 ?먯꽭??</p>
                  </div>
                  {advancedOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">?숈떆??/p>
                      <Select
                        value={draft.concurrencyPolicy}
                        onValueChange={(concurrencyPolicy) => setDraft((current) => ({ ...current, concurrencyPolicy }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {concurrencyPolicies.map((value) => (
                            <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{concurrencyPolicyDescriptions[draft.concurrencyPolicy]}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">諛由??ㅽ뻾 泥섎━</p>
                      <Select
                        value={draft.catchUpPolicy}
                        onValueChange={(catchUpPolicy) => setDraft((current) => ({ ...current, catchUpPolicy }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {catchUpPolicies.map((value) => (
                            <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{catchUpPolicyDescriptions[draft.catchUpPolicy]}</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-3 border-t border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              ?앹꽦 ?꾩뿉???쇱젙, ?뱁썒, ?대? ?ㅽ뻾???꾪븳 ?몃━嫄??ㅼ젙 ?붾㈃?쇰줈 諛붾줈 ?대룞?⑸땲??
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <Button
                onClick={() => createRoutine.mutate()}
                disabled={
                  createRoutine.isPending ||
                  !draft.title.trim() ||
                  !draft.projectId ||
                  !draft.assigneeAgentId
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                {createRoutine.isPending ? "留뚮뱶??以?.." : "猷⑦떞 留뚮뱾湲?}
              </Button>
              {createRoutine.isError ? (
                <p className="text-sm text-destructive">
                  {createRoutine.error instanceof Error ? createRoutine.error.message : "猷⑦떞??留뚮뱾吏 紐삵뻽?듬땲??}
                </p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "猷⑦떞??遺덈윭?ㅼ? 紐삵뻽?듬땲??}
          </CardContent>
        </Card>
      ) : null}

      <div>
        {(routines ?? []).length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Repeat}
              message="?꾩쭅 猷⑦떞???놁뒿?덈떎. '猷⑦떞 留뚮뱾湲?濡?泥?諛섎났 ?뚰겕?뚮줈瑜??뺤쓽?섏꽭??"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-3 py-2 font-medium">?대쫫</th>
                  <th className="px-3 py-2 font-medium">?꾨줈?앺듃</th>
                  <th className="px-3 py-2 font-medium">?먯씠?꾪듃</th>
                  <th className="px-3 py-2 font-medium">理쒓렐 ?ㅽ뻾</th>
                  <th className="px-3 py-2 font-medium">?쒖꽦??/th>
                  <th className="w-12 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {(routines ?? []).map((routine) => {
                  const enabled = routine.status === "active";
                  const isArchived = routine.status === "archived";
                  const isStatusPending = statusMutationRoutineId === routine.id;
                  return (
                    <tr
                      key={routine.id}
                      className="align-middle border-b border-border transition-colors hover:bg-accent/50 last:border-b-0 cursor-pointer"
                      onClick={() => navigate(`/routines/${routine.id}`)}
                    >
                      <td className="px-3 py-2.5">
                        <div className="min-w-[180px]">
                          <span className="font-medium">
                            {routine.title}
                          </span>
                          {(isArchived || routine.status === "paused") && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {isArchived ? "蹂닿??? : "?쇱떆 以묒???}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {routine.projectId ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span
                              className="shrink-0 h-3 w-3 rounded-sm"
                              style={{ backgroundColor: projectById.get(routine.projectId)?.color ?? "#6366f1" }}
                            />
                            <span className="truncate">{projectById.get(routine.projectId)?.name ?? "?????놁쓬"}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">없음</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {routine.assigneeAgentId ? (() => {
                          const agent = agentById.get(routine.assigneeAgentId);
                          return agent ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <AgentIcon icon={agent.icon} className="h-4 w-4 shrink-0" />
                              <span className="truncate">{agent.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">?????놁쓬</span>
                          );
                        })() : (
                          <span className="text-xs text-muted-foreground">없음</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        <div>{formatLastRunTimestamp(routine.lastRun?.triggeredAt)}</div>
                        {routine.lastRun ? (
                          <div className="mt-1 text-xs">{routine.lastRun.status.replaceAll("_", " ")}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            role="switch"
                            data-slot="toggle"
                            aria-checked={enabled}
                            aria-label={enabled ? `${routine.title} 鍮꾪솢?깊솕` : `${routine.title} ?쒖꽦??}
                            disabled={isStatusPending || isArchived}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              enabled ? "bg-foreground" : "bg-muted"
                            } ${isStatusPending || isArchived ? "cursor-not-allowed opacity-50" : ""}`}
                            onClick={() =>
                              updateRoutineStatus.mutate({
                                id: routine.id,
                                status: nextRoutineStatus(routine.status, !enabled),
                              })
                            }
                          >
                            <span
                              className={`inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
                                enabled ? "translate-x-5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {isArchived ? "蹂닿??? : enabled ? "耳쒖쭚" : "爰쇱쭚"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`${routine.title} 異붽? ?묒뾽`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/routines/${routine.id}`)}>
                              ?몄쭛
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={runningRoutineId === routine.id || isArchived}
                              onClick={() => runRoutine.mutate(routine.id)}
                            >
                              {runningRoutineId === routine.id ? "?ㅽ뻾 以?.." : "吏湲??ㅽ뻾"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                updateRoutineStatus.mutate({
                                  id: routine.id,
                                  status: enabled ? "paused" : "active",
                                })
                              }
                              disabled={isStatusPending || isArchived}
                            >
                              {enabled ? "?쇱떆 以묒?" : "?쒖꽦??}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateRoutineStatus.mutate({
                                  id: routine.id,
                                  status: routine.status === "archived" ? "active" : "archived",
                                })
                              }
                              disabled={isStatusPending}
                            >
                              {routine.status === "archived" ? "蹂듭썝" : "蹂닿?"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
