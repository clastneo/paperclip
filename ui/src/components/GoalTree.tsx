import { useState } from "react";
import type { Goal } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { cn } from "../lib/utils";
import { labelForKey } from "../lib/labels";

interface GoalTreeProps {
  goals: Goal[];
  goalLink?: (goal: Goal) => string;
  onSelect?: (goal: Goal) => void;
}

interface GoalNodeProps {
  goal: Goal;
  children: Goal[];
  allGoals: Goal[];
  depth: number;
  goalLink?: (goal: Goal) => string;
  onSelect?: (goal: Goal) => void;
}

function GoalNode({ goal, children, allGoals, depth, goalLink, onSelect }: GoalNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;
  const link = goalLink?.(goal);

  const inner = (
    <>
      {hasChildren ? (
        <button
          className="p-0.5"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
        </button>
      ) : (
        <span className="w-4" />
      )}
      <span className="text-xs text-muted-foreground">{labelForKey(goal.level)}</span>
      <span className="flex-1 truncate">{goal.title}</span>
      <StatusBadge status={goal.status} />
    </>
  );

  const classes = "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-accent/50";

  return (
    <div>
      {link ? (
        <Link
          to={link}
          className={cn(classes, "no-underline text-inherit")}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {inner}
        </Link>
      ) : (
        <div
          className={classes}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => onSelect?.(goal)}
        >
          {inner}
        </div>
      )}
      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <GoalNode
              key={child.id}
              goal={child}
              children={allGoals.filter((item) => item.parentId === child.id)}
              allGoals={allGoals}
              depth={depth + 1}
              goalLink={goalLink}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GoalTree({ goals, goalLink, onSelect }: GoalTreeProps) {
  const goalIds = new Set(goals.map((goal) => goal.id));
  const roots = goals.filter((goal) => !goal.parentId || !goalIds.has(goal.parentId));

  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">목표가 없습니다.</p>;
  }

  return (
    <div className="border border-border py-1">
      {roots.map((goal) => (
        <GoalNode
          key={goal.id}
          goal={goal}
          children={goals.filter((item) => item.parentId === goal.id)}
          allGoals={goals}
          depth={0}
          goalLink={goalLink}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
