import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import type { EquityPoint, StockResult } from "@/types/backtest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  data: EquityPoint[];
}

interface MultiProps {
  stockResults: StockResult[];
  combined: EquityPoint[];
}

const CHART_COLORS = [
  "hsl(199, 89%, 48%)", "hsl(142, 71%, 45%)", "hsl(280, 65%, 60%)",
  "hsl(38, 92%, 50%)", "hsl(340, 82%, 52%)", "hsl(190, 80%, 42%)",
  "hsl(25, 95%, 53%)", "hsl(210, 70%, 55%)", "hsl(160, 60%, 45%)", "hsl(0, 72%, 55%)",
];

function ChartTooltipStyle() {
  return {
    backgroundColor: "hsl(220, 18%, 12%)",
    border: "1px solid hsl(220, 14%, 18%)",
    borderRadius: "8px",
    fontSize: "12px",
    fontFamily: "JetBrains Mono",
  };
}

function SingleEquityChart({ data, color, label }: { data: EquityPoint[]; color: string; label: string }) {
  const gradId = `eq-${label.replace(/\s/g, "")}`;
  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215, 14%, 52%)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(215, 14%, 52%)" }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={ChartTooltipStyle()} labelStyle={{ color: "hsl(215, 14%, 52%)" }} formatter={(value: number) => [`₹${value.toLocaleString()}`, label]} />
          <Area type="monotone" dataKey="equity" stroke={color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SingleDrawdownChart({ data, color, label }: { data: EquityPoint[]; color: string; label: string }) {
  const gradId = `dd-${label.replace(/\s/g, "")}`;
  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215, 14%, 52%)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(215, 14%, 52%)" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} reversed />
          <Tooltip contentStyle={ChartTooltipStyle()} labelStyle={{ color: "hsl(215, 14%, 52%)" }} formatter={(value: number) => [`${value}%`, label]} />
          <Area type="monotone" dataKey="drawdown" stroke={color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EquityChart({ data }: Props) {
  return (
    <div className="panel">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Combined Equity Curve</h3>
      <SingleEquityChart data={data} color="hsl(199, 89%, 48%)" label="Equity" />
    </div>
  );
}

export function DrawdownChart({ data }: Props) {
  return (
    <div className="panel">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Combined Drawdown</h3>
      <SingleDrawdownChart data={data} color="hsl(0, 72%, 55%)" label="Drawdown" />
    </div>
  );
}

export function StockCharts({ stockResults, combined }: MultiProps) {
  if (stockResults.length === 0) return null;

  return (
    <div className="panel">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
        Per-Stock Performance
      </h3>
      <Tabs defaultValue="combined" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1 bg-secondary/50">
          <TabsTrigger value="combined" className="text-xs font-mono">
            Combined
          </TabsTrigger>
          {stockResults.map((sr, i) => (
            <TabsTrigger key={sr.label} value={sr.label} className="text-xs font-mono">
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              {sr.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="combined">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-mono">Equity Curve</p>
              <SingleEquityChart data={combined} color="hsl(199, 89%, 48%)" label="Combined" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-mono">Drawdown</p>
              <SingleDrawdownChart data={combined} color="hsl(0, 72%, 55%)" label="Combined" />
            </div>
          </div>
        </TabsContent>

        {stockResults.map((sr, i) => (
          <TabsContent key={sr.label} value={sr.label}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-mono">Equity — {sr.label}</p>
                <SingleEquityChart data={sr.equity_curve} color={CHART_COLORS[i % CHART_COLORS.length]} label={sr.label} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-mono">Drawdown — {sr.label}</p>
                <SingleDrawdownChart data={sr.equity_curve} color={CHART_COLORS[i % CHART_COLORS.length]} label={sr.label} />
              </div>
            </div>
            {/* Per-stock mini metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: "Net P&L", value: `₹${sr.metrics.net_profit.toLocaleString()}`, positive: sr.metrics.net_profit > 0 },
                { label: "Win Rate", value: `${sr.metrics.win_rate}%`, positive: sr.metrics.win_rate > 50 },
                { label: "Trades", value: sr.metrics.total_trades.toString(), positive: true },
                { label: "Max DD", value: `${sr.metrics.max_drawdown}%`, positive: sr.metrics.max_drawdown < 15 },
              ].map(m => (
                <div key={m.label} className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                  <p className={`text-sm font-mono font-bold mt-1 ${m.positive ? "text-primary" : "text-destructive"}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
