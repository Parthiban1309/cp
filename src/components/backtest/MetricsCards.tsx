import type { Metrics } from "@/types/backtest";
import { TrendingUp, TrendingDown, Target, BarChart2, Activity, Gauge, Percent } from "lucide-react";

interface Props {
  metrics: Metrics;
}

function Card({ label, value, subValue, icon: Icon, positive }: { label: string; value: string; subValue?: string; icon: any; positive?: boolean }) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${positive === true ? "text-primary" : positive === false ? "text-destructive" : "text-muted-foreground"}`} />
      </div>
      <p className={`text-xl font-bold font-mono ${positive === true ? "text-primary glow-green" : positive === false ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
      {subValue && <p className="text-[10px] text-muted-foreground font-mono mt-1">{subValue}</p>}
    </div>
  );
}

export function MetricsCards({ metrics }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <Card label="Net Profit" value={`₹${metrics.net_profit.toLocaleString()}`} subValue={`CAGR: ${metrics.cagr}%`} icon={metrics.net_profit >= 0 ? TrendingUp : TrendingDown} positive={metrics.net_profit >= 0} />
      <Card label="Win Rate" value={`${metrics.win_rate}%`} subValue={`${metrics.winning_trades}W / ${metrics.losing_trades}L`} icon={Target} positive={metrics.win_rate >= 50} />
      <Card label="Profit Factor" value={`${metrics.profit_factor}x`} icon={BarChart2} positive={metrics.profit_factor >= 1} />
      <Card label="Max Drawdown" value={`${metrics.max_drawdown}%`} icon={TrendingDown} positive={false} />
      <Card label="Sharpe Ratio" value={`${metrics.sharpe_ratio}`} icon={Gauge} positive={metrics.sharpe_ratio >= 1} />
      <Card label="Expectancy" value={`₹${metrics.expectancy.toLocaleString()}`} subValue="per trade" icon={Percent} positive={metrics.expectancy >= 0} />
      <Card label="Total Trades" value={`${metrics.total_trades}`} subValue={`Avg Win: ₹${metrics.avg_win.toLocaleString()}`} icon={Activity} />
    </div>
  );
}
