import type { ChargeLedger } from "@/types/backtest";
import { DollarSign } from "lucide-react";

interface Props {
  charges: ChargeLedger;
}

const CHARGE_ITEMS: { key: keyof ChargeLedger; label: string }[] = [
  { key: "total_brokerage", label: "Brokerage" },
  { key: "total_stt", label: "STT" },
  { key: "total_gst", label: "GST" },
  { key: "total_stamp_duty", label: "Stamp Duty" },
  { key: "total_exchange_charges", label: "Exchange Charges" },
];

export function ChargesBreakdown({ charges }: Props) {
  return (
    <div className="panel">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Charges Breakdown</h3>
      </div>
      <div className="space-y-2">
        {CHARGE_ITEMS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono text-foreground">₹{charges[key].toLocaleString()}</span>
          </div>
        ))}
        <div className="border-t border-border pt-2 mt-2 flex items-center justify-between text-xs font-bold">
          <span className="text-foreground">Total Charges</span>
          <span className="font-mono text-accent">₹{charges.grand_total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
