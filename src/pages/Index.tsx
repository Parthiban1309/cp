import { useState, useRef } from "react";
import { toast } from "sonner";
import type { BacktestConfig, BacktestResult, AISuggestion, Indicator, StockTimeframe } from "@/types/backtest";
import type { MonteCarloResult, WalkForwardResult } from "@/types/backtest";
import { DEFAULT_CONFIG } from "@/types/backtest";
import { runMockBacktest, runMockAISuggestions, type BacktestStage } from "@/services/mockBacktest";
import { IndicatorSelector } from "@/components/backtest/IndicatorSelector";
import { StockSelector } from "@/components/backtest/StockSelector";
import { ConfigPanel } from "@/components/backtest/ConfigPanel";
import { MetricsCards } from "@/components/backtest/MetricsCards";
import { StockCharts } from "@/components/backtest/Charts";
import { TradeTable } from "@/components/backtest/TradeTable";
import { AISuggestionsPanel } from "@/components/backtest/AISuggestionsPanel";
import { BacktestProgress } from "@/components/backtest/BacktestProgress";
import { MonthlyReturnsTable } from "@/components/backtest/MonthlyReturnsTable";
import { ChargesBreakdown } from "@/components/backtest/ChargesBreakdown";
import { MonteCarloPanel } from "@/components/backtest/MonteCarloPanel";
import { WalkForwardPanel } from "@/components/backtest/WalkForwardPanel";
import { SimulationSuggestions } from "@/components/backtest/SimulationSuggestions";
import { AIChatbot } from "@/components/backtest/AIChatbot";
import { Play, Loader2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Index() {
  const [indicators, setIndicators] = useState<Indicator[]>(["RSI", "MACD", "EMA"]);
  const [stockTimeframes, setStockTimeframes] = useState<StockTimeframe[]>([
    { stock: "RELIANCE", timeframes: ["15m"] },
    { stock: "TCS", timeframes: ["5m", "15m"] },
    { stock: "INFY", timeframes: ["1h"] },
  ]);
  const [config, setConfig] = useState<BacktestConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion | null>(null);
  const [running, setRunning] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [stage, setStage] = useState<BacktestStage>("init");
  const [startTime, setStartTime] = useState<number | null>(null);
  const abortRef = useRef(false);

  // Simulation results for suggestions + chatbot context
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [walkForwardResult, setWalkForwardResult] = useState<WalkForwardResult | null>(null);

  const handleRun = async () => {
    if (indicators.length === 0) { toast.error("Select at least 1 indicator"); return; }
    if (stockTimeframes.length === 0) { toast.error("Select at least 1 stock"); return; }

    abortRef.current = false;
    setRunning(true);
    setResult(null);
    setAiSuggestions(null);
    setMonteCarloResult(null);
    setWalkForwardResult(null);
    setStage("init");
    setStartTime(Date.now());

    try {
      const res = await runMockBacktest(indicators, stockTimeframes, config, (s) => {
        if (!abortRef.current) setStage(s);
      });
      if (abortRef.current) { toast.info("Backtest cancelled"); return; }
      setResult(res);
      toast.success(`Backtest complete — ${res.trades.length} trades processed`);

      setAiLoading(true);
      const suggestions = await runMockAISuggestions(res, (s) => {
        if (!abortRef.current) setStage(s);
      });
      if (!abortRef.current) { setAiSuggestions(suggestions); setAiLoading(false); }
    } catch {
      if (!abortRef.current) toast.error("Backtest failed");
    } finally {
      setRunning(false);
      setStartTime(null);
    }
  };

  const handleCancel = () => {
    abortRef.current = true;
    setRunning(false);
    setStartTime(null);
    toast.info("Backtest cancelled");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/alpha-insight-logo.svg"
            alt="Alpha Insight Lab logo"
            className="h-8 w-8 shrink-0"
          />
          <h1 className="text-base font-bold tracking-tight">Alpha Insight Lab</h1>
          <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">v2.0</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className={`h-2 w-2 rounded-full ${running ? "bg-accent animate-pulse" : "bg-primary"}`} />
          {running ? "Computing..." : "Ready"}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-5 p-5">
        <div className="lg:w-80 space-y-4 flex-shrink-0">
          <IndicatorSelector selected={indicators} onChange={setIndicators} />
          <StockSelector selected={stockTimeframes} onChange={setStockTimeframes} />
        </div>

        <div className="flex-1 space-y-4 min-w-0">
          <ConfigPanel config={config} onChange={setConfig} />

          <div className="flex gap-3">
            <Button onClick={handleRun} disabled={running} className="flex-1 h-11 font-semibold text-sm tracking-wide" size="lg">
              {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running Backtest...</> : <><Play className="mr-2 h-4 w-4" />Run Backtest</>}
            </Button>
            {running && (
              <Button onClick={handleCancel} variant="destructive" size="lg" className="h-11">
                <StopCircle className="mr-2 h-4 w-4" />Cancel
              </Button>
            )}
          </div>

          {running && <BacktestProgress stage={stage} startTime={startTime} />}
        </div>
      </div>

      {result && (
        <div className="px-5 pb-8 space-y-5">
          <div className="border-t border-border pt-5">
            <MetricsCards metrics={result.metrics} />
          </div>

          <StockCharts stockResults={result.stock_results} combined={result.equity_curve} />
          <MonthlyReturnsTable data={result.monthly_returns} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <TradeTable trades={result.trades} />
            </div>
            <div className="space-y-5">
              <ChargesBreakdown charges={result.charge_ledger} />
              <AISuggestionsPanel suggestions={aiSuggestions} loading={aiLoading} />
            </div>
          </div>
        </div>
      )}

      {/* Simulation Section */}
      <div className="px-5 pb-8">
        <div className="border-t border-border pt-5">
          <Tabs defaultValue="montecarlo" className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Advanced Simulations</h2>
              <TabsList className="bg-secondary ml-auto">
                <TabsTrigger value="montecarlo" className="text-xs">Monte Carlo</TabsTrigger>
                <TabsTrigger value="walkforward" className="text-xs">Walk-Forward</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="montecarlo">
              {result ? (
                <div className="space-y-4">
                  <MonteCarloPanel backtestResult={result} onResult={setMonteCarloResult} />
                  <SimulationSuggestions monteCarloResult={monteCarloResult} />
                </div>
              ) : (
                <div className="panel text-center py-8 text-sm text-muted-foreground">
                  Run a backtest first to calibrate Monte Carlo parameters from your strategy's performance.
                </div>
              )}
            </TabsContent>
            <TabsContent value="walkforward">
              <div className="space-y-4">
                <WalkForwardPanel indicators={indicators} stockTimeframes={stockTimeframes} config={config} onResult={setWalkForwardResult} />
                <SimulationSuggestions walkForwardResult={walkForwardResult} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* AI Chatbot */}
      <AIChatbot
        backtestResult={result}
        monteCarloResult={monteCarloResult}
        walkForwardResult={walkForwardResult}
      />
    </div>
  );
}
