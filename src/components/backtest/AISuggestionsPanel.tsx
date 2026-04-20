import type { AISuggestion } from "@/types/backtest";
import { Brain, AlertTriangle, Lightbulb, Settings, TrendingDown, DollarSign } from "lucide-react";

interface Props {
  suggestions: AISuggestion | null;
  loading: boolean;
}

function SuggestionSection({ title, icon: Icon, items, color }: { title: string; icon: any; items: string[]; color: string }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-secondary-foreground leading-relaxed pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AISuggestionsPanel({ suggestions, loading }: Props) {
  return (
    <div className="panel">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">AI Analysis</h3>
        {loading && <span className="ml-auto text-[10px] text-accent animate-pulse-glow font-mono">Analyzing...</span>}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {!loading && !suggestions && (
        <p className="text-xs text-muted-foreground py-8 text-center">Run a backtest to get AI-driven suggestions</p>
      )}

      {!loading && suggestions && (
        <div className="space-y-5">
          {suggestions.performance_summary && (
            <div className="space-y-1 p-3 bg-secondary/30 rounded-md border border-border">
              {Object.entries(suggestions.performance_summary).map(([k, v]) => (
                <p key={k} className="text-xs text-secondary-foreground"><span className="text-muted-foreground capitalize">{k}:</span> {v}</p>
              ))}
            </div>
          )}
          <SuggestionSection title="Key Issues" icon={AlertTriangle} items={suggestions.key_issues} color="text-accent" />
          <SuggestionSection title="Strategy Weaknesses" icon={TrendingDown} items={suggestions.strategy_weakness} color="text-destructive" />
          <SuggestionSection title="Actionable Suggestions" icon={Lightbulb} items={suggestions.actionable_suggestions} color="text-primary" />
          <SuggestionSection title="Config Issues" icon={Settings} items={suggestions.config_issues} color="text-muted-foreground" />

          {suggestions.risk_analysis && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk Analysis</span>
              </div>
              <div className="p-3 bg-destructive/5 rounded-md border border-destructive/20 space-y-1">
                {Object.entries(suggestions.risk_analysis).map(([k, v]) => (
                  <p key={k} className="text-xs text-secondary-foreground"><span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</span> {v}</p>
                ))}
              </div>
            </div>
          )}

          {suggestions.cost_analysis && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost Analysis</span>
              </div>
              <div className="p-3 bg-accent/5 rounded-md border border-accent/20 space-y-1">
                {Object.entries(suggestions.cost_analysis).map(([k, v]) => (
                  <p key={k} className="text-xs text-secondary-foreground"><span className="text-muted-foreground capitalize">{k}:</span> {v}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
