import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Identity } from "./Identity";
import { approvalLabel, typeIcon, defaultTypeIcon, ApprovalPayloadRenderer } from "./ApprovalPayload";
import { timeAgo } from "../lib/timeAgo";
import type { Approval, Agent } from "@paperclipai/shared";
import { labelForKey } from "../lib/labels";

function statusIcon(status: string) {
  if (status === "approved") return <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />;
  if (status === "rejected") return <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />;
  if (status === "revision_requested") return <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
  if (status === "pending") return <Clock className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />;
  return null;
}

export function ApprovalCard({
  approval,
  requesterAgent,
  onApprove,
  onReject,
  onOpen,
  detailLink,
  isPending,
}: {
  approval: Approval;
  requesterAgent: Agent | null;
  onApprove: () => void;
  onReject: () => void;
  onOpen?: () => void;
  detailLink?: string;
  isPending: boolean;
}) {
  const Icon = typeIcon[approval.type] ?? defaultTypeIcon;
  const label = approvalLabel(approval.type, approval.payload as Record<string, unknown> | null);
  const showResolutionButtons =
    approval.type !== "budget_override_required" &&
    (approval.status === "pending" || approval.status === "revision_requested");

  return (
    <div className="space-y-0 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            {requesterAgent && (
              <span className="text-xs text-muted-foreground">
                요청자 <Identity name={requesterAgent.name} size="sm" className="inline-flex" />
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {statusIcon(approval.status)}
          <span className="text-xs text-muted-foreground">{labelForKey(approval.status)}</span>
          <span className="text-xs text-muted-foreground">· {timeAgo(approval.createdAt)}</span>
        </div>
      </div>

      <ApprovalPayloadRenderer type={approval.type} payload={approval.payload} />

      {approval.decisionNote && (
        <div className="mt-3 border-t border-border pt-2 text-xs italic text-muted-foreground">
          메모: {approval.decisionNote}
        </div>
      )}

      {showResolutionButtons && (
        <div className="mt-4 flex gap-2 border-t border-border pt-3">
          <Button
            size="sm"
            className="bg-green-700 text-white hover:bg-green-600"
            onClick={onApprove}
            disabled={isPending}
          >
            승인
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onReject}
            disabled={isPending}
          >
            거절
          </Button>
        </div>
      )}
      <div className="mt-3">
        {detailLink ? (
          <Button variant="ghost" size="sm" className="px-0 text-xs" asChild>
            <Link to={detailLink}>상세 보기</Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="px-0 text-xs" onClick={onOpen}>
            상세 보기
          </Button>
        )}
      </div>
    </div>
  );
}
