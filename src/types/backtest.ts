export const INDICATORS = [
  "RSI", "MACD", "EMA", "SMA", "Bollinger Bands", "VWAP",
  "Supertrend", "ATR", "Stochastic RSI", "ADX",
  "Volume", "Momentum", "Ichimoku", "Pivot Points", "OBV",
] as const;

export const STOCKS = [
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK",
  "SBIN", "LT", "WIPRO", "AXISBANK", "ITC",
] as const;

export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1D"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export interface StockTimeframe {
  stock: Stock;
  timeframes: Timeframe[];
}

export type Indicator = (typeof INDICATORS)[number];
export type Stock = (typeof STOCKS)[number];

// Config dropdown options
export const POSITION_SIZE_TYPES = ["percent_of_capital", "fixed_quantity", "kelly_criterion", "volatility_adjusted"] as const;
export const STOP_LOSS_TYPES = ["percent", "atr_based", "fixed_points", "volatility_based"] as const;
export const BROKERAGE_MODELS = ["india_standard", "zerodha", "angel_one", "upstox", "custom"] as const;
export const EXECUTION_TYPES = ["market", "limit", "stop_limit", "iceberg"] as const;
export const TRADE_TYPES = ["intraday", "positional", "swing", "btst"] as const;
export const TREND_FILTERS = ["above_50MA", "above_200MA", "above_20EMA", "above_9EMA", "none"] as const;
export const VOLATILITY_FILTERS = ["low", "moderate", "high", "any"] as const;
export const RSI_THRESHOLDS = [">60", ">50", ">40", ">70", "<30", "<40", "any"] as const;

export interface BacktestConfig {
  capital: {
    initial_capital: number;
    risk_per_trade: number;
    position_size_type: string;
    max_concurrent_positions: number;
  };
  risk: {
    stop_loss_type: string;
    stop_loss_value: number;
    take_profit_ratio: number;
    trailing_stop: boolean;
    max_drawdown_limit: number;
  };
  execution: {
    slippage: number;
    brokerage_model: string;
    execution_type: string;
    timeframe: string;
    trade_type: string;
  };
  filters: {
    min_volume: number;
    trend_filter: string;
    volatility_filter: string;
    RSI_threshold: string;
  };
}

export interface Trade {
  id: number;
  entry_time: string;
  exit_time: string;
  instrument: string;
  side: "LONG" | "SHORT";
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  charges: number;
  net_pnl: number;
}

export interface Metrics {
  net_profit: number;
  gross_profit: number;
  gross_loss: number;
  win_rate: number;
  profit_factor: number;
  max_drawdown: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_win: number;
  avg_loss: number;
  sharpe_ratio: number;
  cagr: number;
  expectancy: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
}

export interface MonthlyReturn {
  month: string;
  pnl: number;
  return_pct: number;
  trades: number;
}

export interface ChargeLedger {
  total_brokerage: number;
  total_stt: number;
  total_gst: number;
  total_stamp_duty: number;
  total_exchange_charges: number;
  grand_total: number;
}

export interface StockResult {
  stock: string;
  timeframe: string;
  label: string;
  metrics: Metrics;
  trades: Trade[];
  equity_curve: EquityPoint[];
  charge_ledger: ChargeLedger;
  monthly_returns: MonthlyReturn[];
}

export interface BacktestResult {
  metrics: Metrics;
  trades: Trade[];
  equity_curve: EquityPoint[];
  charge_ledger: ChargeLedger;
  monthly_returns: MonthlyReturn[];
  stock_results: StockResult[];
}

export interface AISuggestion {
  performance_summary: Record<string, string>;
  key_issues: string[];
  risk_analysis: Record<string, string>;
  cost_analysis: Record<string, string>;
  strategy_weakness: string[];
  actionable_suggestions: string[];
  config_issues: string[];
}

// Monte Carlo types
export interface MonteCarloPath {
  day: number;
  price: number;
  pathId: number;
}

export interface MonteCarloResult {
  stock: string;
  currentPrice: number;
  paths: MonteCarloPath[];
  percentiles: { day: number; p5: number; p10: number; p25: number; p50: number; p75: number; p90: number; p95: number }[];
  expectedReturn: number;
  valueAtRisk95: number;
  probabilityOfProfit: number;
  conditionalVaR: number;
  calibration: {
    dailyDrift: number;
    dailyVol: number;
    annualizedReturn: number;
    annualizedVol: number;
    skewness: number;
    dataPoints: number;
  };
}

// Walk-Forward types
export interface WalkForwardWindow {
  id: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  inSampleReturn: number;
  outOfSampleReturn: number;
  inSampleSharpe: number;
  outOfSampleSharpe: number;
  inSampleWinRate: number;
  outOfSampleWinRate: number;
  degradation: number;
}

export interface WalkForwardResult {
  windows: WalkForwardWindow[];
  avgInSampleReturn: number;
  avgOutOfSampleReturn: number;
  robustnessScore: number;
  overfitProbability: number;
  recommendation: string;
}

export const DEFAULT_CONFIG: BacktestConfig = {
  capital: {
    initial_capital: 100000,
    risk_per_trade: 1,
    position_size_type: "percent_of_capital",
    max_concurrent_positions: 3,
  },
  risk: {
    stop_loss_type: "percent",
    stop_loss_value: 1.5,
    take_profit_ratio: 2,
    trailing_stop: false,
    max_drawdown_limit: 20,
  },
  execution: {
    slippage: 0.1,
    brokerage_model: "india_standard",
    execution_type: "market",
    timeframe: "15m",
    trade_type: "intraday",
  },
  filters: {
    min_volume: 100000,
    trend_filter: "above_50MA",
    volatility_filter: "moderate",
    RSI_threshold: ">60",
  },
};

export const PRESETS: Record<string, Partial<BacktestConfig>> = {
  conservative: {
    capital: { initial_capital: 100000, risk_per_trade: 0.5, position_size_type: "percent_of_capital", max_concurrent_positions: 2 },
    risk: { stop_loss_type: "percent", stop_loss_value: 1, take_profit_ratio: 3, trailing_stop: true, max_drawdown_limit: 10 },
  },
  balanced: {
    capital: { initial_capital: 100000, risk_per_trade: 1, position_size_type: "percent_of_capital", max_concurrent_positions: 3 },
    risk: { stop_loss_type: "percent", stop_loss_value: 1.5, take_profit_ratio: 2, trailing_stop: false, max_drawdown_limit: 20 },
  },
  aggressive: {
    capital: { initial_capital: 100000, risk_per_trade: 2.5, position_size_type: "percent_of_capital", max_concurrent_positions: 5 },
    risk: { stop_loss_type: "percent", stop_loss_value: 2.5, take_profit_ratio: 1.5, trailing_stop: false, max_drawdown_limit: 35 },
  },
};
