import { useState } from "react";
import type { WalkForwardResult } from "@/types/backtest";
import { runWalkForwardAnalysis } from "@/services/mockBacktest";
import type { Indicator, StockTimeframe, BacktestConfig } from "@/types/backtest";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Footprints, Loader2, ShieldCheck, AlertTriangle, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { toast } from "sonner";

interface Props {
  indicators: Indicator[];
  stockTimeframes: StockTimeframe[];
  config: BacktestConfig;
  onResult?: (result: WalkForwardResult) => void;
}

export function WalkForwardPanel({ indicators, stockTimeframes, config, onResult }: Props) {
  const [numWindows, setNumWindows] = useState(6);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<WalkForwardResult | null>(null);

  const handleRun = async () => {
    if (indicators.length === 0 || stockTimeframes.length === 0) {
      toast.error("Select indicators and stocks first");
      return;
    }
    setRunning(true);
    setProgress(0);
    setResult(null);
    try {
      const res = await runWalkForwardAnalysis(indicators, stockTimeframes, config, numWindows, (p) => setProgress(p));
      setResult(res);
      onResult?.(res);
      toast.success("Walk-Forward analysis complete");
    } catch {
      toast.error("Analysis failed");
    } finally {
      setRunning(false);
    }
  };

  const getRobustnessColor = (score: number) => {
    if (score >= 70) return "text-primary";
    if (score >= 45) return "text-accent";
    return "text-destructive";
  };

  const getRobustnessIcon = (score: number) => {
    if (score >= 70) return <ShieldCheck className="h-5 w-5 text-primary" />;
    if (score >= 45) return <AlertTriangle className="h-5 w-5 text-accent" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  return (
    <div className="panel space-y-4">
      <div className="flex items-center gap-2">
        <Footprints className="h-5 w-5 text-accent" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Walk-Forward Analysis</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Test strategy robustness by training on in-sample windows and validating on out-of-sample data. Detects overfitting.
      </p>

      <div className="flex gap-3 items-end">
        <div className="space-y-1 flex-1">
          <Label className="text-xs text-muted-foreground">Number of Windows</Label>
          <Input type="number" value={numWindows} onChange={e => setNumWindows(Math.max(3, Math.min(12, +e.target.value)))} min={3} max={12} className="h-8 text-xs font-mono bg-background" />
        </div>
        <Button onClick={handleRun} disabled={running} className="h-8 text-xs font-semibold">
          {running ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Analyzing...</> : <><Footprints className="mr-1.5 h-3.5 w-3.5" />Run Analysis</>}
        </Button>
      </div>

      {running && <Progress value={progress} className="h-2" />}

      {result && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Robustness Score */}
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-md">
            {getRobustnessIcon(result.robustnessScore)}
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${getRobustnessColor(result.robustnessScore)}`}>{result.robustnessScore}%</span>
                <span className="text-xs text-muted-foreground uppercase">Robustness</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{result.recommendation}</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-destructive">{result.overfitProbability}%</div>
              <div className="text-[10px] text-muted-foreground uppercase">Overfit Prob.</div>
            </div>
          </div>

          {/* Returns summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="metric-card text-center">
              <div className="text-lg font-bold font-mono text-primary">{result.avgInSampleReturn}%</div>
              <div className="text-[10px] text-muted-foreground uppercase">Avg In-Sample Return</div>
            </div>
            <div className="metric-card text-center">
              <div className={`text-lg font-bold font-mono ${result.avgOutOfSampleReturn >= 0 ? "text-primary" : "text-destructive"}`}>
                {result.avgOutOfSampleReturn}%
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">Avg Out-of-Sample Return</div>
            </div>
          </div>

          {/* Bar chart comparing IS vs OOS returns */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">In-Sample vs Out-of-Sample Returns</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.windows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="id" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Window", position: "insideBottom", offset: -5, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`${v}%`, ""]} />
                  <Legend wrapperStyle={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }} />
                  <Bar dataKey="inSampleReturn" name="In-Sample" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="outOfSampleReturn" name="Out-of-Sample" radius={[3, 3, 0, 0]}>
                    {result.windows.map((w, i) => (
                      <Cell key={i} fill={w.outOfSampleReturn >= 0 ? "hsl(var(--chart-equity))" : "hsl(var(--destructive))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Window details table */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Window Details</h4>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-1.5 px-2 text-left font-medium">#</th>
                    <th className="py-1.5 px-2 text-left font-medium">Train Period</th>
                    <th className="py-1.5 px-2 text-left font-medium">Test Period</th>
                    <th className="py-1.5 px-2 text-right font-medium">IS Return</th>
                    <th className="py-1.5 px-2 text-right font-medium">OOS Return</th>
                    <th className="py-1.5 px-2 text-right font-medium">Degradation</th>
                  </tr>
                </thead>
                <tbody>
                  {result.windows.map(w => (
                    <tr key={w.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-1.5 px-2 font-mono">{w.id}</td>
                      <td className="py-1.5 px-2 font-mono text-muted-foreground">{w.trainStart} → {w.trainEnd}</td>
                      <td className="py-1.5 px-2 font-mono text-muted-foreground">{w.testStart} → {w.testEnd}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-primary">{w.inSampleReturn}%</td>
                      <td className={`py-1.5 px-2 text-right font-mono ${w.outOfSampleReturn >= 0 ? "text-primary" : "text-destructive"}`}>{w.outOfSampleReturn}%</td>
                      <td className={`py-1.5 px-2 text-right font-mono ${w.degradation > 0.5 ? "text-destructive" : "text-accent"}`}>{(w.degradation * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
