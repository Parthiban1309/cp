import { useState } from "react";
import type { BacktestConfig } from "@/types/backtest";
import {
  PRESETS, POSITION_SIZE_TYPES, STOP_LOSS_TYPES, BROKERAGE_MODELS,
  EXECUTION_TYPES, TRADE_TYPES, TREND_FILTERS, VOLATILITY_FILTERS,
  RSI_THRESHOLDS, TIMEFRAMES
} from "@/types/backtest";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Shield, Zap, Filter, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  config: BacktestConfig;
  onChange: (c: BacktestConfig) => void;
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-secondary/50 hover:bg-secondary transition-colors"
      >
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        {open ? <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="p-3 grid grid-cols-2 gap-3">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function DropdownField({ label, value, options, onValueChange }: {
  label: string;
  value: string;
  options: readonly string[];
  onValueChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 text-xs font-mono bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt} className="text-xs font-mono">{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function ConfigPanel({ config, onChange }: Props) {
  const update = (section: keyof BacktestConfig, key: string, value: any) => {
    onChange({
      ...config,
      [section]: { ...config[section], [key]: value },
    });
  };

  const applyPreset = (name: string) => {
    const preset = PRESETS[name];
    if (!preset) return;
    onChange({
      ...config,
      ...preset,
      capital: { ...config.capital, ...preset.capital },
      risk: { ...config.risk, ...preset.risk },
    } as BacktestConfig);
  };

  return (
    <div className="panel space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Configuration</h3>
        <div className="flex gap-1.5">
          {["conservative", "balanced", "aggressive"].map(p => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className="px-2.5 py-1 text-[10px] font-semibold uppercase rounded border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Section title="Capital" icon={Settings}>
          <Field label="Initial Capital">
            <Input type="number" value={config.capital.initial_capital} onChange={e => update("capital", "initial_capital", +e.target.value)} className="h-8 text-xs font-mono bg-background" />
          </Field>
          <Field label="Risk Per Trade (%)">
            <Input type="number" step={0.1} value={config.capital.risk_per_trade} onChange={e => update("capital", "risk_per_trade", +e.target.value)} className="h-8 text-xs font-mono bg-background" />
          </Field>
          <DropdownField label="Position Size Type" value={config.capital.position_size_type} options={POSITION_SIZE_TYPES} onValueChange={v => update("capital", "position_size_type", v)} />
          <Field label="Max Concurrent Positions">
            <Input type="number" value={config.capital.max_concurrent_positions} onChange={e => update("capital", "max_concurrent_positions", +e.target.value)} className="h-8 text-xs font-mono bg-background" />
          </Field>
        </Section>

        <Section title="Risk" icon={Shield}>
          <DropdownField label="Stop Loss Type" value={config.risk.stop_loss_type} options={STOP_LOSS_TYPES} onValueChange={v => update("risk", "stop_loss_type", v)} />
          <Field label="Stop Loss Value (%)">
            <Input type="number" step={0.1} value={config.risk.stop_loss_value} onChange={e => update("risk", "stop_loss_value", +e.target.value)} className="h-8 text-xs font-mono bg-background" />
          </Field>
          <Field label="Take Profit Ratio">
            <Input type="number" step={0.1} value={config.risk.take_profit_ratio} onChange={e => update("risk", "take_profit_ratio", +e.target.value)} className="h-8 text-xs font-mono bg-background" />
          </Field>
          <Field label="Trailing Stop">
            <Switch checked={config.risk.trailing_stop} onCheckedChange={v => update("risk", "trailing_stop", v)} />
          </Field>
          <Field label="Max Drawdown Limit (%)">
            <Input type="number" value={config.risk.max_drawdown_limit} onChange={e => update("risk", "max_drawdown_limit", +e.target.value)} className="h-8 text-xs font-mono bg-background" />
          </Field>
        </Section>

        <Section title="Execution" icon={Zap}>
          <Field label="Slippage (%)">
            <Input type="number" step={0.01} value={config.execution.slippage} onChange={e => update("execution", "slippage", +e.target.value)} className="h-8 text-xs font-mono bg-background" />
          </Field>
          <DropdownField label="Brokerage Model" value={config.execution.brokerage_model} options={BROKERAGE_MODELS} onValueChange={v => update("execution", "brokerage_model", v)} />
          <DropdownField label="Execution Type" value={config.execution.execution_type} options={EXECUTION_TYPES} onValueChange={v => update("execution", "execution_type", v)} />
          <DropdownField label="Timeframe" value={config.execution.timeframe} options={TIMEFRAMES} onValueChange={v => update("execution", "timeframe", v)} />
          <DropdownField label="Trade Type" value={config.execution.trade_type} options={TRADE_TYPES} onValueChange={v => update("execution", "trade_type", v)} />
        </Section>

        <Section title="Filters" icon={Filter}>
          <Field label="Min Volume">
            <Input type="number" value={config.filters.min_volume} onChange={e => update("filters", "min_volume", +e.target.value)} className="h-8 text-xs font-mono bg-background" />
          </Field>
          <DropdownField label="Trend Filter" value={config.filters.trend_filter} options={TREND_FILTERS} onValueChange={v => update("filters", "trend_filter", v)} />
          <DropdownField label="Volatility Filter" value={config.filters.volatility_filter} options={VOLATILITY_FILTERS} onValueChange={v => update("filters", "volatility_filter", v)} />
          <DropdownField label="RSI Threshold" value={config.filters.RSI_threshold} options={RSI_THRESHOLDS} onValueChange={v => update("filters", "RSI_threshold", v)} />
        </Section>
      </div>
    </div>
  );
}
