import { INDICATORS, type Indicator } from "@/types/backtest";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface Props {
  selected: Indicator[];
  onChange: (v: Indicator[]) => void;
}

export function IndicatorSelector({ selected, onChange }: Props) {
  const toggle = (ind: Indicator) => {
    if (selected.includes(ind)) {
      onChange(selected.filter(i => i !== ind));
    } else {
      onChange([...selected, ind]);
    }
  };

  return (
    <div className="panel space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Indicators
        </h3>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {selected.length}/15
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {INDICATORS.map(ind => {
          const active = selected.includes(ind);
          return (
            <button
              key={ind}
              onClick={() => toggle(ind)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border ${
                active
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
              }`}
            >
              {ind}
            </button>
          );
        })}
      </div>
    </div>
  );
}
