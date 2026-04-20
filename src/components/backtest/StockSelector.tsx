import { STOCKS, TIMEFRAMES, type Stock, type Timeframe, type StockTimeframe } from "@/types/backtest";
import { BarChart3, Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  selected: StockTimeframe[];
  onChange: (v: StockTimeframe[]) => void;
}

export function StockSelector({ selected, onChange }: Props) {
  const selectedStocks = selected.map(s => s.stock);

  const toggleStock = (stock: Stock) => {
    if (selectedStocks.includes(stock)) {
      onChange(selected.filter(s => s.stock !== stock));
    } else {
      onChange([...selected, { stock, timeframes: ["15m"] }]);
    }
  };

  const toggleTimeframe = (stock: Stock, tf: Timeframe) => {
    onChange(selected.map(s => {
      if (s.stock !== stock) return s;
      const has = s.timeframes.includes(tf);
      const newTfs = has
        ? s.timeframes.filter(t => t !== tf)
        : [...s.timeframes, tf];
      return { ...s, timeframes: newTfs.length > 0 ? newTfs : [tf] };
    }));
  };

  return (
    <div className="panel space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Stocks
        </h3>
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {selected.length}/10
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {STOCKS.map(stock => {
          const active = selectedStocks.includes(stock);
          return (
            <button
              key={stock}
              onClick={() => toggleStock(stock)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all duration-150 border ${
                active
                  ? "bg-accent/15 border-accent/50 text-accent"
                  : "bg-secondary border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
              }`}
            >
              {stock}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            <Clock className="h-3 w-3" />
            Timeframes per stock (multi-select)
          </div>
          {selected.map(({ stock, timeframes }) => (
            <div key={stock} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-foreground w-20">{stock}</span>
                <button onClick={() => toggleStock(stock)} className="text-muted-foreground hover:text-destructive ml-auto">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 ml-1">
                {TIMEFRAMES.map(tf => {
                  const active = timeframes.includes(tf);
                  return (
                    <button
                      key={tf}
                      onClick={() => toggleTimeframe(stock, tf)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border transition-all ${
                        active
                          ? "bg-primary/15 border-primary/50 text-primary"
                          : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                      }`}
                    >
                      {tf}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
