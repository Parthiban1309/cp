import type { MonteCarloResult, WalkForwardResult } from "@/types/backtest";
import { Lightbulb, TrendingUp, ShieldAlert, Settings, AlertTriangle } from "lucide-react";

interface Props {
  monteCarloResult?: MonteCarloResult | null;
  walkForwardResult?: WalkForwardResult | null;
}

function generateMCSuggestions(mc: MonteCarloResult): string[] {
  const suggestions: string[] = [];
  
  if (mc.valueAtRisk95 > 15) {
    suggestions.push(`High VaR of ${mc.valueAtRisk95}% — reduce position size or add hedging. Consider using options as portfolio insurance.`);
  }
  if (mc.probabilityOfProfit < 55) {
    suggestions.push(`Probability of profit is only ${mc.probabilityOfProfit}% — strategy has near coin-flip odds. Add trend confirmation filters.`);
  }
  if (mc.calibration.annualizedVol > 30) {
    suggestions.push(`Annualized volatility of ${mc.calibration.annualizedVol}% is excessive. Use volatility-adjusted position sizing (e.g., Kelly criterion).`);
  }
  if (mc.calibration.skewness < -0.3) {
    suggestions.push(`Negative skew (${mc.calibration.skewness}) indicates fat left tail risk. Implement tighter stop-losses and avoid holding overnight.`);
  }
  if (mc.conditionalVaR > 20) {
    suggestions.push(`CVaR of ${mc.conditionalVaR}% shows severe tail risk. Add max drawdown circuit breaker at ${Math.floor(mc.conditionalVaR * 0.6)}%.`);
  }
  if (mc.expectedReturn < 5) {
    suggestions.push(`Expected return of ${mc.expectedReturn}% is weak. Consider longer holding periods or higher-conviction setups only.`);
  }
  if (mc.probabilityOfProfit >= 65 && mc.expectedReturn > 10) {
    suggestions.push(`Strong probability of profit (${mc.probabilityOfProfit}%) with ${mc.expectedReturn}% expected return — consider scaling up position size by 20-30%.`);
  }
  
  if (suggestions.length === 0) {
    suggestions.push("Monte Carlo metrics are within acceptable ranges. Monitor VaR and rebalance monthly.");
  }

  return suggestions;
}

function generateWFSuggestions(wf: WalkForwardResult): string[] {
  const suggestions: string[] = [];
  const avgDeg = wf.windows.reduce((s, w) => s + w.degradation, 0) / wf.windows.length;

  if (wf.overfitProbability > 60) {
    suggestions.push(`Overfit probability of ${wf.overfitProbability}% is dangerous. Reduce indicator count and simplify entry/exit rules.`);
  }
  if (wf.robustnessScore < 50) {
    suggestions.push(`Low robustness (${wf.robustnessScore}%). Strategy is curve-fitted. Use fewer parameters and wider stop-losses.`);
  }
  if (avgDeg > 0.4) {
    suggestions.push(`Average performance degradation of ${(avgDeg * 100).toFixed(0)}% between IS and OOS. Simplify signal logic to reduce parameter sensitivity.`);
  }
  
  const negOOS = wf.windows.filter(w => w.outOfSampleReturn < 0);
  if (negOOS.length > wf.windows.length * 0.5) {
    suggestions.push(`${negOOS.length} of ${wf.windows.length} OOS windows are negative. Strategy fails in real conditions — needs fundamental redesign.`);
  }

  if (wf.robustnessScore > 70 && wf.overfitProbability < 30) {
    suggestions.push(`Strong robustness (${wf.robustnessScore}%) with low overfit risk. Strategy is suitable for paper trading validation before going live.`);
  }

  const bestWindow = wf.windows.reduce((best, w) => w.outOfSampleReturn > best.outOfSampleReturn ? w : best);
  const worstWindow = wf.windows.reduce((worst, w) => w.outOfSampleReturn < worst.outOfSampleReturn ? w : worst);
  suggestions.push(`Best OOS performance in Window #${bestWindow.id} (${bestWindow.outOfSampleReturn}%), worst in #${worstWindow.id} (${worstWindow.outOfSampleReturn}%). Analyze market conditions in those periods.`);

  return suggestions;
}

export function SimulationSuggestions({ monteCarloResult, walkForwardResult }: Props) {
  const mcSuggestions = monteCarloResult ? generateMCSuggestions(monteCarloResult) : [];
  const wfSuggestions = walkForwardResult ? generateWFSuggestions(walkForwardResult) : [];

  if (!mcSuggestions.length && !wfSuggestions.length) return null;

  return (
    <div className="space-y-4">
      {mcSuggestions.length > 0 && (
        <div className="p-4 bg-secondary/30 border border-border rounded-lg space-y-2.5">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monte Carlo Strategy Suggestions</span>
          </div>
          <ul className="space-y-2">
            {mcSuggestions.map((s, i) => (
              <li key={i} className="text-xs text-secondary-foreground leading-relaxed pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-accent">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {wfSuggestions.length > 0 && (
        <div className="p-4 bg-secondary/30 border border-border rounded-lg space-y-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Walk-Forward Strategy Suggestions</span>
          </div>
          <ul className="space-y-2">
            {wfSuggestions.map((s, i) => (
              <li key={i} className="text-xs text-secondary-foreground leading-relaxed pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-primary">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
