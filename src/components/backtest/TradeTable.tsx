import type { Trade } from "@/types/backtest";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  trades: Trade[];
}

export function TradeTable({ trades }: Props) {
  const fmt = (d: string) => {
    const dt = new Date(d);
    return `${dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} ${dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="panel">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Trade Log</h3>
      <div className="max-h-[400px] overflow-auto scrollbar-thin rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">#</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Entry</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Exit</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Instrument</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Side</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Entry ₹</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Exit ₹</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Qty</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">PnL</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right">Net PnL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map(t => (
              <TableRow key={t.id} className="hover:bg-secondary/30 text-xs font-mono">
                <TableCell className="text-muted-foreground">{t.id}</TableCell>
                <TableCell>{fmt(t.entry_time)}</TableCell>
                <TableCell>{fmt(t.exit_time)}</TableCell>
                <TableCell className="font-semibold">{t.instrument}</TableCell>
                <TableCell>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.side === "LONG" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                    {t.side}
                  </span>
                </TableCell>
                <TableCell className="text-right">{t.entry_price.toFixed(2)}</TableCell>
                <TableCell className="text-right">{t.exit_price.toFixed(2)}</TableCell>
                <TableCell className="text-right">{t.quantity}</TableCell>
                <TableCell className={`text-right font-semibold ${t.pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                  ₹{t.pnl.toLocaleString()}
                </TableCell>
                <TableCell className={`text-right font-semibold ${t.net_pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                  ₹{t.net_pnl.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
