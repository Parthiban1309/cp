import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import type { BacktestStage } from "@/services/mockBacktest";
import { STAGE_LABELS, STAGE_PROGRESS } from "@/services/mockBacktest";
import { Loader2, CheckCircle2, Clock } from "lucide-react";

interface Props {
  stage: BacktestStage;
  startTime: number | null;
}

const STAGES_ORDER: BacktestStage[] = [
  "init", "loading_data", "computing_signals", "executing_trades",
  "calculating_metrics", "generating_report", "ai_analysis", "done",
];

export function BacktestProgress({ stage, startTime }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime || stage === "done") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, stage]);

  const progress = STAGE_PROGRESS[stage] || 0;
  const currentIdx = STAGES_ORDER.indexOf(stage);

  return (
    <div className="panel space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {stage !== "done" ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-semibold text-foreground">
            {STAGE_LABELS[stage]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Clock className="h-3 w-3" />
          {elapsed}s
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="grid grid-cols-4 gap-2">
        {STAGES_ORDER.filter(s => s !== "done").map((s, i) => {
          const isDone = i < currentIdx;
          const isCurrent = s === stage;
          return (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                isDone ? "bg-primary" : isCurrent ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
              }`} />
              <span className={`text-[10px] truncate ${
                isDone ? "text-primary" : isCurrent ? "text-foreground" : "text-muted-foreground/50"
              }`}>
                {STAGE_LABELS[s].replace("...", "")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
