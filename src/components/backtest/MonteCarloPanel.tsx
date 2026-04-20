import { useState } from "react";
import { STOCKS, type Stock, type BacktestResult } from "@/types/backtest";
import type { MonteCarloResult } from "@/types/backtest";
import { runMonteCarloSimulation, MC_STAGE_LABELS, type MonteCarloStage } from "@/services/mockBacktest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dice5, Loader2, TrendingUp, TrendingDown, Target, ShieldAlert, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface Props {
  backtestResult: BacktestResult;
  onResult?: (result: MonteCarloResult) => void;
}

export function MonteCarloPanel({ backtestResult, onResult }: Props) {
  const availableStocks = [...new Set(backtestResult.stock_results.map(sr => sr.stock))];
  const [stock, setStock] = useState<string>(availableStocks[0] || "RELIANCE");
  const [days, setDays] = useState(60);
  const [numPaths, setNumPaths] = useState(1000);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<MonteCarloStage>("preparing");
  const [result, setResult] = useState<MonteCarloResult | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setProgress(0);
    setResult(null);
    try {
      const res = await runMonteCarloSimulation(
        backtestResult, stock, days, numPaths,
        (s) => setStage(s),
        (p) => setProgress(p)
      );
      setResult(res);
      onResult?.(res);
      toast.success(`Monte Carlo complete — ${numPaths} paths over ${days} days`);
    } catch {
      toast.error("Simulation failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="panel space-y-4">
      <div className="flex items-center gap-2">
        <Dice5 className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Monte Carlo Simulation</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Simulates future equity paths using drift & volatility calibrated from your backtest results. Uses Geometric Brownian Motion with skewness and jump-diffusion.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Stock</Label>
          <Select value={stock} onValueChange={setStock}>
            <SelectTrigger className="h-8 text-xs font-mono bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableStocks.map(s => <SelectItem key={s} value={s} className="text-xs font-mono">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Forecast Days</Label>
          <Input type="number" value={days} onChange={e => setDays(+e.target.value)} min={5} max={252} className="h-8 text-xs font-mono bg-background" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Simulations</Label>
          <Input type="number" value={numPaths} onChange={e => setNumPaths(+e.target.value)} min={100} max={10000} step={100} className="h-8 text-xs font-mono bg-background" />
        </div>
      </div>

      <Button onClick={handleRun} disabled={running} className="w-full h-10 font-semibold text-sm">
        {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Simulating...</> : <><Dice5 className="mr-2 h-4 w-4" />Run Simulation</>}
      </Button>

      {running && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground font-mono text-center">{MC_STAGE_LABELS[stage]}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Calibration info */}
          <div className="p-3 bg-secondary/50 rounded-md space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
              <BarChart3 className="h-3 w-3" /> Model Calibration (from backtest)
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Daily Drift:</span><span className="font-mono text-foreground">{result.calibration.dailyDrift}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Daily Vol:</span><span className="font-mono text-foreground">{result.calibration.dailyVol}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Skewness:</span><span className="font-mono text-foreground">{result.calibration.skewness}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ann. Return:</span><span className="font-mono text-primary">{result.calibration.annualizedReturn}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ann. Vol:</span><span className="font-mono text-accent">{result.calibration.annualizedVol}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Data Points:</span><span className="font-mono text-foreground">{result.calibration.dataPoints}</span></div>
            </div>
          </div>

          {/* Summary metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="metric-card text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold font-mono text-primary">{result.expectedReturn}%</div>
              <div className="text-[10px] text-muted-foreground uppercase">Expected Return</div>
            </div>
            <div className="metric-card text-center">
              <TrendingDown className="h-4 w-4 mx-auto mb-1 text-destructive" />
              <div className="text-lg font-bold font-mono text-destructive">{result.valueAtRisk95}%</div>
              <div className="text-[10px] text-muted-foreground uppercase">VaR (95%)</div>
            </div>
            <div className="metric-card text-center">
              <ShieldAlert className="h-4 w-4 mx-auto mb-1 text-accent" />
              <div className="text-lg font-bold font-mono text-accent">{result.conditionalVaR}%</div>
              <div className="text-[10px] text-muted-foreground uppercase">CVaR (ES)</div>
            </div>
            <div className="metric-card text-center">
              <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold font-mono text-primary">{result.probabilityOfProfit}%</div>
              <div className="text-[10px] text-muted-foreground uppercase">Prob. of Profit</div>
            </div>
          </div>

          {/* Confidence cone chart */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Price Confidence Cone — {result.stock}</h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.percentiles}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Days", position: "insideBottom", offset: -5, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} domain={["auto", "auto"]} tickFormatter={v => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number, name: string) => [`₹${v.toFixed(2)}`, name.toUpperCase()]}
                  />
                  <Area type="monotone" dataKey="p5" stroke="none" fill="hsl(var(--destructive) / 0.08)" name="5th pct" />
                  <Area type="monotone" dataKey="p10" stroke="none" fill="hsl(var(--destructive) / 0.05)" name="10th pct" />
                  <Area type="monotone" dataKey="p25" stroke="none" fill="hsl(var(--chart-drawdown) / 0.12)" name="25th pct" />
                  <Area type="monotone" dataKey="p50" stroke="hsl(var(--primary))" strokeWidth={2} fill="none" name="Median" />
                  <Area type="monotone" dataKey="p75" stroke="none" fill="hsl(var(--primary) / 0.12)" name="75th pct" />
                  <Area type="monotone" dataKey="p90" stroke="none" fill="hsl(var(--primary) / 0.06)" name="90th pct" />
                  <Area type="monotone" dataKey="p95" stroke="none" fill="hsl(var(--primary) / 0.03)" name="95th pct" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary inline-block" /> Median</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary/20 inline-block" /> P25–P75</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary/8 inline-block" /> P5–P95</span>
            </div>
          </div>

          {/* Terminal price distribution */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-secondary/50 rounded-md">
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1.5">Terminal Price Distribution ({days}-Day Forecast)</div>
            <div className="flex justify-between"><span>Current Price:</span><span className="font-mono text-foreground">₹{result.currentPrice.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Worst Case (5th pct):</span><span className="font-mono text-destructive">₹{result.percentiles[result.percentiles.length - 1].p5.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>10th Percentile:</span><span className="font-mono text-destructive/80">₹{result.percentiles[result.percentiles.length - 1].p10.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Median Forecast:</span><span className="font-mono text-accent">₹{result.percentiles[result.percentiles.length - 1].p50.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>90th Percentile:</span><span className="font-mono text-primary/80">₹{result.percentiles[result.percentiles.length - 1].p90.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Best Case (95th pct):</span><span className="font-mono text-primary">₹{result.percentiles[result.percentiles.length - 1].p95.toFixed(2)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
