import type { MonthlyReturn } from "@/types/backtest";
import { Calendar } from "lucide-react";

interface Props {
  data: MonthlyReturn[];
}

export function MonthlyReturnsTable({ data }: Props) {
  return (
    <div className="panel">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Monthly Returns</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {data.map(m => (
          <div
            key={m.month}
            className={`p-3 rounded-md border text-center font-mono text-xs ${
              m.pnl >= 0
                ? "border-primary/20 bg-primary/5"
                : "border-destructive/20 bg-destructive/5"
            }`}
          >
            <p className="text-muted-foreground text-[10px] mb-1">{m.month}</p>
            <p className={`font-bold ${m.pnl >= 0 ? "text-primary" : "text-destructive"}`}>
              {m.return_pct >= 0 ? "+" : ""}{m.return_pct}%
            </p>
            <p className="text-muted-foreground text-[10px] mt-0.5">{m.trades} trades</p>
          </div>
        ))}
      </div>
    </div>
  );
}
