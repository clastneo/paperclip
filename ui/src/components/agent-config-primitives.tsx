import { useState, useRef, useEffect, useCallback } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { AGENT_ROLE_LABELS } from "@paperclipai/shared";

/* ---- Help text for (?) tooltips ---- */
export const help: Record<string, string> = {
  name: "이 에이전트에 표시할 이름입니다.",
  title: "조직도에 표시할 직함입니다.",
  role: "조직 내 역할입니다. 위치와 권한 범위에 영향을 줍니다.",
  reportsTo: "조직 계층에서 이 에이전트가 보고하는 대상입니다.",
  capabilities: "이 에이전트가 할 수 있는 일을 설명합니다. 조직도와 작업 라우팅에 사용됩니다.",
  adapterType: "에이전트를 실행하는 방식입니다. 로컬 CLI(Claude/Codex/OpenCode), OpenClaw Gateway, spawned process, 범용 HTTP webhook 중에서 선택합니다.",
  cwd: "로컬 어댑터용 레거시 작업 디렉터리 대체값입니다. 기존 에이전트에는 남아 있을 수 있지만, 새 설정에서는 프로젝트 워크스페이스 사용을 권장합니다.",
  promptTemplate: "모든 하트비트 때마다 전송됩니다. 작고 동적인 내용으로 유지하고, 큰 고정 지침보다는 현재 작업 맥락에 사용하세요. {{ agent.id }}, {{ agent.name }}, {{ agent.role }} 등 템플릿 변수를 지원합니다.",
  model: "어댑터가 사용할 기본 모델을 덮어씁니다.",
  thinkingEffort: "모델의 추론 깊이를 조절합니다. 지원 값은 어댑터와 모델마다 다릅니다.",
  chrome: "--chrome 플래그를 전달해 Claude의 Chrome 통합을 켭니다.",
  dangerouslySkipPermissions: "지원되는 경우 어댑터 권한 요청을 자동 승인해 무인 실행합니다.",
  dangerouslyBypassSandbox: "Codex를 샌드박스 제한 없이 실행합니다. 파일시스템/네트워크 접근에 필요합니다.",
  search: "실행 중 Codex 웹 검색 기능을 활성화합니다.",
  workspaceStrategy: "Paperclip이 이 에이전트의 실행 워크스페이스를 구성하는 방식입니다. 일반적인 cwd 실행은 project_primary, 이슈별 격리 체크아웃은 git_worktree를 사용하세요.",
  workspaceBaseRef: "워크트리 브랜치를 만들 때 사용할 기준 git ref입니다. 비워 두면 해석된 워크스페이스 ref 또는 HEAD를 사용합니다.",
  workspaceBranchTemplate: "파생 브랜치 이름 템플릿입니다. {{issue.identifier}}, {{issue.title}}, {{agent.name}}, {{project.id}}, {{workspace.repoRef}}, {{slug}}를 지원합니다.",
  worktreeParentDir: "파생 워크트리를 만들 디렉터리입니다. 절대 경로, ~ 경로, 저장소 상대 경로를 지원합니다.",
  runtimeServicesJson: "워크스페이스 런타임 서비스 정의입니다. 공유 앱 서버, 워커 등 장수명 보조 프로세스를 연결할 때 사용합니다.",
  maxTurnsPerRun: "하트비트 한 번에 허용할 최대 에이전트 턴 수(도구 호출 수)입니다.",
  command: "실행할 명령입니다. 예: node, python",
  localCommand: "어댑터가 호출할 CLI 명령 경로를 덮어씁니다. 예: /usr/local/bin/claude, codex, opencode",
  args: "명령줄 인자입니다. 쉼표로 구분합니다.",
  extraArgs: "로컬 어댑터에 추가로 넘길 CLI 인자입니다. 쉼표로 구분합니다.",
  envVars: "어댑터 프로세스에 주입할 환경 변수입니다. 일반 값이나 시크릿 참조를 사용할 수 있습니다.",
  bootstrapPrompt: "Paperclip이 새 세션을 시작할 때만 전송됩니다. 매 하트비트마다 반복하면 안 되는 안정적인 초기 설정 안내에 사용하세요.",
  payloadTemplateJson: "원격 어댑터 요청 payload에 Paperclip 표준 wake/workspace 필드를 추가하기 전에 병합할 선택적 JSON입니다.",
  webhookUrl: "에이전트가 호출될 때 POST 요청을 받을 URL입니다.",
  heartbeatInterval: "이 에이전트를 타이머로 자동 실행합니다. 새 작업 확인 같은 주기적 작업에 유용합니다.",
  intervalSec: "자동 하트비트 실행 간격(초)입니다.",
  timeoutSec: "실행을 강제 종료하기 전까지 허용할 최대 시간(초)입니다. 0은 제한 없음입니다.",
  graceSec: "인터럽트를 보낸 뒤 프로세스를 강제 종료하기 전까지 기다릴 시간(초)입니다.",
  wakeOnDemand: "할당, API 호출, UI 동작, 자동화 시스템에 의해 이 에이전트를 깨울 수 있게 합니다.",
  cooldownSec: "연속된 하트비트 실행 사이의 최소 간격(초)입니다.",
  maxConcurrentRuns: "이 에이전트에서 동시에 실행할 수 있는 최대 하트비트 수입니다.",
  budgetMonthlyCents: "월간 지출 한도(센트)입니다. 0은 제한 없음입니다.",
};

export const adapterLabels: Record<string, string> = {
  claude_local: "Claude (로컬)",
  codex_local: "Codex (로컬)",
  gemini_local: "Gemini CLI (로컬)",
  opencode_local: "OpenCode (로컬)",
  openclaw_gateway: "OpenClaw Gateway",
  cursor: "Cursor (로컬)",
  hermes_local: "Hermes 에이전트",
  process: "프로세스",
  http: "HTTP",
};

export const roleLabels = AGENT_ROLE_LABELS as Record<string, string>;

/* ---- Primitive components ---- */

export function HintIcon({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <HelpCircle className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        {hint && <HintIcon text={hint} />}
      </div>
      {children}
    </div>
  );
}

export function ToggleField({
  label,
  hint,
  checked,
  onChange,
  toggleTestId,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  toggleTestId?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {hint && <HintIcon text={hint} />}
      </div>
      <button
        data-slot="toggle"
        data-testid={toggleTestId}
        type="button"
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
          checked ? "bg-green-600" : "bg-muted"
        )}
        onClick={() => onChange(!checked)}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
            checked ? "translate-x-4.5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

export function ToggleWithNumber({
  label,
  hint,
  checked,
  onCheckedChange,
  number,
  onNumberChange,
  numberLabel,
  numberHint,
  numberPrefix,
  showNumber,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  number: number;
  onNumberChange: (v: number) => void;
  numberLabel: string;
  numberHint?: string;
  numberPrefix?: string;
  showNumber: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          {hint && <HintIcon text={hint} />}
        </div>
        <button
          data-slot="toggle"
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
            checked ? "bg-green-600" : "bg-muted"
          )}
          onClick={() => onCheckedChange(!checked)}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
              checked ? "translate-x-4.5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>
      {showNumber && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {numberPrefix && <span>{numberPrefix}</span>}
          <input
            type="number"
            className="w-16 rounded-md border border-border px-2 py-0.5 bg-transparent outline-none text-xs font-mono text-center"
            value={number}
            onChange={(e) => onNumberChange(Number(e.target.value))}
          />
          <span>{numberLabel}</span>
          {numberHint && <HintIcon text={numberHint} />}
        </div>
      )}
    </div>
  );
}

export function CollapsibleSection({
  title,
  icon,
  open,
  onToggle,
  bordered,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(bordered && "border-t border-border")}>
      <button
        className="flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent/30 transition-colors"
        onClick={onToggle}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {icon}
        {title}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export function AutoExpandTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  minRows,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minRows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rows = minRows ?? 3;
  const lineHeight = 20;
  const minHeight = rows * lineHeight;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, [minHeight]);

  useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      className="w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40 resize-none overflow-hidden"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      style={{ minHeight }}
    />
  );
}

/**
 * Text input that manages internal draft state.
 * Calls `onCommit` on blur (and optionally on every change if `immediate` is set).
 */
export function DraftInput({
  value,
  onCommit,
  immediate,
  className,
  ...props
}: {
  value: string;
  onCommit: (v: string) => void;
  immediate?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "className">) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <input
      className={className}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (immediate) onCommit(e.target.value);
      }}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      {...props}
    />
  );
}

/**
 * Auto-expanding textarea with draft state and blur-commit.
 */
export function DraftTextarea({
  value,
  onCommit,
  immediate,
  placeholder,
  minRows,
}: {
  value: string;
  onCommit: (v: string) => void;
  immediate?: boolean;
  placeholder?: string;
  minRows?: number;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rows = minRows ?? 3;
  const lineHeight = 20;
  const minHeight = rows * lineHeight;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
  }, [minHeight]);

  useEffect(() => { adjustHeight(); }, [draft, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      className="w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40 resize-none overflow-hidden"
      placeholder={placeholder}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (immediate) onCommit(e.target.value);
      }}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      style={{ minHeight }}
    />
  );
}

/**
 * Number input with draft state and blur-commit.
 */
export function DraftNumberInput({
  value,
  onCommit,
  immediate,
  className,
  ...props
}: {
  value: number;
  onCommit: (v: number) => void;
  immediate?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "className" | "type">) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <input
      type="number"
      className={className}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        if (immediate) onCommit(Number(e.target.value) || 0);
      }}
      onBlur={() => {
        const num = Number(draft) || 0;
        if (num !== value) onCommit(num);
      }}
      {...props}
    />
  );
}

/**
 * "Choose" button that opens a dialog explaining the user must manually
 * type the path due to browser security limitations.
 */
export function ChoosePathButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors shrink-0"
        onClick={() => setOpen(true)}
      >
        Choose
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Specify path manually</DialogTitle>
            <DialogDescription>
              Browser security blocks apps from reading full local paths via a file picker.
              Copy the absolute path and paste it into the input.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section className="space-y-1.5">
              <p className="font-medium">macOS (Finder)</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Find the folder in Finder.</li>
                <li>Hold <kbd>Option</kbd> and right-click the folder.</li>
                <li>Click "Copy &lt;folder name&gt; as Pathname".</li>
                <li>Paste the result into the path input.</li>
              </ol>
              <p className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                /Users/yourname/Documents/project
              </p>
            </section>
            <section className="space-y-1.5">
              <p className="font-medium">Windows (File Explorer)</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Find the folder in File Explorer.</li>
                <li>Hold <kbd>Shift</kbd> and right-click the folder.</li>
                <li>Click "Copy as path".</li>
                <li>Paste the result into the path input.</li>
              </ol>
              <p className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                C:\Users\yourname\Documents\project
              </p>
            </section>
            <section className="space-y-1.5">
              <p className="font-medium">Terminal fallback (macOS/Linux)</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Run <code>cd /path/to/folder</code>.</li>
                <li>Run <code>pwd</code>.</li>
                <li>Copy the output and paste it into the path input.</li>
              </ol>
            </section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Label + input rendered on the same line (inline layout for compact fields).
 */
export function InlineField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 shrink-0">
        <label className="text-xs text-muted-foreground">{label}</label>
        {hint && <HintIcon text={hint} />}
      </div>
      <div className="w-24 ml-auto">{children}</div>
    </div>
  );
}
