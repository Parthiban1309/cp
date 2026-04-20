import type { BacktestResult, Trade, EquityPoint, Metrics, ChargeLedger, AISuggestion, MonthlyReturn, StockResult, StockTimeframe, MonteCarloResult, MonteCarloPath, WalkForwardResult, WalkForwardWindow } from "@/types/backtest";

// Seeded PRNG (mulberry32)
function createSeededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashInputs(indicators: string[], stocks: string[], config: any): number {
  const str = JSON.stringify({ indicators: [...indicators].sort(), stocks: [...stocks].sort(), config });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash);
}

function randomBetween(rng: () => number, a: number, b: number) {
  return a + rng() * (b - a);
}

// Box-Muller transform for normal distribution
function randomNormal(rng: () => number, mean = 0, std = 1): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

// Realistic NSE stock prices (approximate as of early 2025)
const STOCK_PRICES: Record<string, { price: number; dailyVol: number; annualReturn: number }> = {
  RELIANCE: { price: 1265, dailyVol: 0.018, annualReturn: 0.08 },
  TCS:      { price: 3780, dailyVol: 0.014, annualReturn: 0.12 },
  INFY:     { price: 1580, dailyVol: 0.016, annualReturn: 0.10 },
  HDFCBANK: { price: 1690, dailyVol: 0.015, annualReturn: 0.09 },
  ICICIBANK:{ price: 1240, dailyVol: 0.017, annualReturn: 0.14 },
  SBIN:     { price: 780, dailyVol: 0.022, annualReturn: 0.11 },
  LT:       { price: 3450, dailyVol: 0.016, annualReturn: 0.10 },
  WIPRO:    { price: 295, dailyVol: 0.019, annualReturn: 0.06 },
  AXISBANK: { price: 1125, dailyVol: 0.018, annualReturn: 0.12 },
  ITC:      { price: 435, dailyVol: 0.013, annualReturn: 0.07 },
};

function generateTrades(rng: () => number, stocks: string[], count: number, indicatorCount: number): Trade[] {
  const trades: Trade[] = [];
  const baseDate = new Date("2024-01-15T09:15:00");
  const edgeBias = 0.02 * (indicatorCount - 3);

  for (let i = 0; i < count; i++) {
    const instrument = stocks[Math.floor(rng() * stocks.length)];
    const side = rng() > 0.48 ? "LONG" : "SHORT" as const;
    const stockInfo = STOCK_PRICES[instrument] || { price: 1000, dailyVol: 0.02, annualReturn: 0.1 };
    // Realistic price with daily volatility
    const entryPrice = stockInfo.price * (1 + randomNormal(rng, 0, stockInfo.dailyVol * 3));

    const winProb = 0.45 + edgeBias + rng() * 0.15;
    const isWin = rng() < winProb;
    let pnlPct: number;
    if (isWin) {
      pnlPct = randomBetween(rng, 0.3, 3.5);
    } else {
      pnlPct = -randomBetween(rng, 0.2, 2.8);
    }

    const exitPrice = side === "LONG"
      ? entryPrice * (1 + pnlPct / 100)
      : entryPrice * (1 - pnlPct / 100);
    const qty = Math.max(1, Math.floor(50000 / entryPrice)); // ~₹50k position
    const rawPnl = (exitPrice - entryPrice) * qty * (side === "LONG" ? 1 : -1);

    const turnover = (entryPrice + exitPrice) * qty;
    const brokerage = Math.min(20, turnover * 0.0003);
    const stt = side === "LONG" ? exitPrice * qty * 0.00025 : 0;
    const gst = brokerage * 0.18;
    const stampDuty = entryPrice * qty * 0.00003;
    const exchangeCharges = turnover * 0.0000345;
    const charges = brokerage + stt + gst + stampDuty + exchangeCharges;

    const dayOffset = Math.floor(i * 1.5 + rng() * 2);
    const entryHour = 9 + Math.floor(rng() * 6);
    const entryMin = 15 + Math.floor(rng() * 45);
    const entryDate = new Date(baseDate);
    entryDate.setDate(entryDate.getDate() + dayOffset);
    entryDate.setHours(entryHour, entryMin, Math.floor(rng() * 60));

    const holdMinutes = Math.floor(randomBetween(rng, 5, 300));
    const exitDate = new Date(entryDate.getTime() + holdMinutes * 60000);
    if (exitDate.getHours() >= 15 && exitDate.getMinutes() > 30) {
      exitDate.setHours(15, 25 + Math.floor(rng() * 5), 0);
    }

    trades.push({
      id: i + 1,
      entry_time: entryDate.toISOString(),
      exit_time: exitDate.toISOString(),
      instrument,
      side,
      entry_price: +entryPrice.toFixed(2),
      exit_price: +exitPrice.toFixed(2),
      quantity: qty,
      pnl: +rawPnl.toFixed(2),
      charges: +charges.toFixed(2),
      net_pnl: +(rawPnl - charges).toFixed(2),
    });
  }
  return trades.sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
}

function generateEquityCurve(trades: Trade[], initialCapital: number): EquityPoint[] {
  const points: EquityPoint[] = [];
  let equity = initialCapital;
  let peak = initialCapital;
  points.push({ date: "2024-01-15", equity: initialCapital, drawdown: 0 });
  for (const trade of trades) {
    equity += trade.net_pnl;
    peak = Math.max(peak, equity);
    const dd = ((peak - equity) / peak) * 100;
    points.push({ date: trade.exit_time.split("T")[0], equity: +equity.toFixed(2), drawdown: +dd.toFixed(2) });
  }
  return points;
}

function computeMetrics(rng: () => number, trades: Trade[], initialCapital: number): Metrics {
  const wins = trades.filter(t => t.net_pnl > 0);
  const losses = trades.filter(t => t.net_pnl <= 0);
  const grossProfit = wins.reduce((s, t) => s + t.net_pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.net_pnl, 0));
  let equity = initialCapital, peak = initialCapital, maxDD = 0;
  const dailyReturns: number[] = [];
  let prevEquity = initialCapital;
  for (const t of trades) {
    equity += t.net_pnl;
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, ((peak - equity) / peak) * 100);
    dailyReturns.push((equity - prevEquity) / prevEquity);
    prevEquity = equity;
  }
  const avgReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / dailyReturns.length;
  const sharpe = Math.sqrt(variance) > 0 ? (avgReturn / Math.sqrt(variance)) * Math.sqrt(252) : 0;
  const totalReturn = (equity - initialCapital) / initialCapital;
  const years = (trades.length * 1.5) / 252;
  const cagr = years > 0 ? (Math.pow(1 + totalReturn, 1 / years) - 1) * 100 : 0;

  return {
    net_profit: +(grossProfit - grossLoss).toFixed(2),
    gross_profit: +grossProfit.toFixed(2),
    gross_loss: +grossLoss.toFixed(2),
    win_rate: +(wins.length / trades.length * 100).toFixed(1),
    profit_factor: grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : 0,
    max_drawdown: +maxDD.toFixed(2),
    total_trades: trades.length,
    winning_trades: wins.length,
    losing_trades: losses.length,
    avg_win: wins.length > 0 ? +(grossProfit / wins.length).toFixed(2) : 0,
    avg_loss: losses.length > 0 ? +(grossLoss / losses.length).toFixed(2) : 0,
    sharpe_ratio: +sharpe.toFixed(2),
    cagr: +cagr.toFixed(2),
    expectancy: trades.length > 0 ? +((grossProfit - grossLoss) / trades.length).toFixed(2) : 0,
  };
}

function computeCharges(trades: Trade[]): ChargeLedger {
  let totalBrokerage = 0, totalStt = 0, totalGst = 0, totalStamp = 0, totalExchange = 0;
  for (const t of trades) {
    const turnover = (t.entry_price + t.exit_price) * t.quantity;
    totalBrokerage += Math.min(20, turnover * 0.0003);
    totalStt += t.side === "LONG" ? t.exit_price * t.quantity * 0.00025 : 0;
    totalGst += Math.min(20, turnover * 0.0003) * 0.18;
    totalStamp += t.entry_price * t.quantity * 0.00003;
    totalExchange += turnover * 0.0000345;
  }
  return {
    total_brokerage: +totalBrokerage.toFixed(2),
    total_stt: +totalStt.toFixed(2),
    total_gst: +totalGst.toFixed(2),
    total_stamp_duty: +totalStamp.toFixed(2),
    total_exchange_charges: +totalExchange.toFixed(2),
    grand_total: +(totalBrokerage + totalStt + totalGst + totalStamp + totalExchange).toFixed(2),
  };
}

function computeMonthlyReturns(trades: Trade[], initialCapital: number): MonthlyReturn[] {
  const monthlyMap: Record<string, number> = {};
  for (const t of trades) {
    const month = t.exit_time.slice(0, 7);
    monthlyMap[month] = (monthlyMap[month] || 0) + t.net_pnl;
  }
  let cumEquity = initialCapital;
  return Object.entries(monthlyMap).sort().map(([month, pnl]) => {
    const returnPct = (pnl / cumEquity) * 100;
    cumEquity += pnl;
    return { month, pnl: +pnl.toFixed(2), return_pct: +returnPct.toFixed(2), trades: trades.filter(t => t.exit_time.startsWith(month)).length };
  });
}

export type BacktestStage = "init" | "loading_data" | "computing_signals" | "executing_trades" | "calculating_metrics" | "generating_report" | "ai_analysis" | "done";

export const STAGE_LABELS: Record<BacktestStage, string> = {
  init: "Initializing engine...",
  loading_data: "Loading historical OHLCV data...",
  computing_signals: "Computing indicator signals...",
  executing_trades: "Simulating trade execution...",
  calculating_metrics: "Calculating performance metrics...",
  generating_report: "Generating detailed report...",
  ai_analysis: "Running AI analysis...",
  done: "Complete",
};

export const STAGE_PROGRESS: Record<BacktestStage, number> = {
  init: 5,
  loading_data: 15,
  computing_signals: 35,
  executing_trades: 55,
  calculating_metrics: 70,
  generating_report: 85,
  ai_analysis: 95,
  done: 100,
};

// Flatten StockTimeframe[] with multi-timeframes into individual pairs
function flattenStockTimeframes(stockTimeframes: StockTimeframe[]): { stock: string; timeframe: string }[] {
  const pairs: { stock: string; timeframe: string }[] = [];
  for (const st of stockTimeframes) {
    for (const tf of st.timeframes) {
      pairs.push({ stock: st.stock, timeframe: tf });
    }
  }
  return pairs;
}

export async function runMockBacktest(
  indicators: string[],
  stockTimeframes: StockTimeframe[],
  config: any,
  onStageChange?: (stage: BacktestStage) => void
): Promise<BacktestResult> {
  const pairs = flattenStockTimeframes(stockTimeframes);
  const stocks = pairs.map(p => p.stock);
  const seed = hashInputs(indicators, stocks, config);
  const rng = createSeededRandom(seed);

  const stages: BacktestStage[] = ["init", "loading_data", "computing_signals", "executing_trades", "calculating_metrics", "generating_report"];
  const baseDurations = [2000, 7000, 10000, 10000, 6000, 5000];
  for (let i = 0; i < stages.length; i++) {
    onStageChange?.(stages[i]);
    await new Promise(r => setTimeout(r, baseDurations[i] + rng() * 1500));
  }

  const tradeCount = 30 + Math.floor(rng() * 30) + stocks.length * 3 + indicators.length * 2;
  const trades = generateTrades(rng, [...new Set(stocks)], tradeCount, indicators.length);
  const metrics = computeMetrics(rng, trades, config.capital.initial_capital);
  const equity_curve = generateEquityCurve(trades, config.capital.initial_capital);
  const charge_ledger = computeCharges(trades);
  const monthly_returns = computeMonthlyReturns(trades, config.capital.initial_capital);

  const stock_results: StockResult[] = pairs.map(pair => {
    const stockSeed = hashInputs(indicators, [pair.stock], { ...config, tf: pair.timeframe });
    const stockRng = createSeededRandom(stockSeed);
    const count = 8 + Math.floor(stockRng() * 15) + indicators.length;
    const stockTrades = generateTrades(stockRng, [pair.stock], count, indicators.length);
    const perCapital = config.capital.initial_capital / pairs.length;
    return {
      stock: pair.stock,
      timeframe: pair.timeframe,
      label: `${pair.stock} · ${pair.timeframe}`,
      metrics: computeMetrics(stockRng, stockTrades, perCapital),
      trades: stockTrades,
      equity_curve: generateEquityCurve(stockTrades, perCapital),
      charge_ledger: computeCharges(stockTrades),
      monthly_returns: computeMonthlyReturns(stockTrades, perCapital),
    };
  });

  return { metrics, trades, equity_curve, charge_ledger, monthly_returns, stock_results };
}

export async function runMockAISuggestions(
  result: BacktestResult,
  onStageChange?: (stage: BacktestStage) => void
): Promise<AISuggestion> {
  onStageChange?.("ai_analysis");
  await new Promise(r => setTimeout(r, 4000 + Math.random() * 2000));
  onStageChange?.("done");

  const { metrics } = result;
  const pf = metrics.profit_factor;
  const dd = metrics.max_drawdown;
  const winRate = metrics.win_rate;

  return {
    performance_summary: {
      overall: pf >= 1.5 ? "Strategy shows strong profitability with consistent edge"
        : pf >= 1.0 ? "Strategy is marginally profitable — optimization needed"
        : "Strategy is unprofitable in current configuration",
      risk_adjusted: metrics.sharpe_ratio > 1.5 ? "Excellent risk-adjusted returns"
        : metrics.sharpe_ratio > 0.8 ? "Acceptable risk-adjusted returns"
        : "Poor risk-adjusted returns — rework needed",
      return_profile: `CAGR of ${metrics.cagr}% with max drawdown of ${dd.toFixed(1)}%`,
    },
    key_issues: [
      ...(winRate < 45 ? ["Low win rate suggests entry signals need refinement"] : []),
      ...(dd > 15 ? [`Max drawdown of ${dd.toFixed(1)}% exceeds safe limits`] : []),
      ...(pf < 1.2 ? ["Profit factor below 1.2 indicates thin edge"] : []),
      "High losing trades during volatile sessions",
      "Stop-loss placement may be too tight",
    ],
    risk_analysis: {
      max_drawdown: dd > 20 ? `Critical: Drawdown ${dd.toFixed(1)}%` : `Drawdown ${dd.toFixed(1)}% acceptable`,
      tail_risk: "Several trades show >2x average loss",
      consecutive_losses: "Analyze max consecutive loss streaks",
    },
    cost_analysis: {
      impact: `Costs consume ~${((result.charge_ledger.grand_total / Math.max(metrics.gross_profit, 1)) * 100).toFixed(1)}% of gross profit`,
      suggestion: "Reduce trade frequency or use limit orders",
    },
    strategy_weakness: [
      ...(winRate < 50 ? ["Entry accuracy below 50% — add confirmation filters"] : []),
      "No re-entry logic after stop-loss",
      "Missing volatility-adjusted sizing",
    ],
    actionable_suggestions: [
      "Add ATR-based stop-loss instead of fixed percentage",
      "Implement trailing stop after 1.5x risk target",
      "Add volume confirmation filter",
      "Scale into positions instead of full allocation",
      "Add time-of-day filter — avoid first/last 15min",
    ],
    config_issues: [
      ...(pf < 1.3 ? ["Increase take_profit_ratio"] : []),
      "Validate slippage model against live fills",
    ],
  };
}

// ========================
// MONTE CARLO SIMULATION (based on backtest results)
// ========================
export type MonteCarloStage = "preparing" | "extracting_returns" | "calibrating_model" | "running_paths" | "computing_stats" | "done";

export const MC_STAGE_LABELS: Record<MonteCarloStage, string> = {
  preparing: "Preparing simulation engine...",
  extracting_returns: "Extracting return distribution from backtest...",
  calibrating_model: "Calibrating GBM parameters from equity curve...",
  running_paths: "Running Monte Carlo paths...",
  computing_stats: "Computing percentiles & risk metrics...",
  done: "Simulation complete",
};

export const MC_STAGE_PROGRESS: Record<MonteCarloStage, number> = {
  preparing: 5,
  extracting_returns: 15,
  calibrating_model: 30,
  running_paths: 80,
  computing_stats: 95,
  done: 100,
};

export async function runMonteCarloSimulation(
  backtestResult: BacktestResult,
  stock: string,
  days: number,
  numPaths: number,
  onStageChange?: (stage: MonteCarloStage) => void,
  onProgress?: (pct: number) => void
): Promise<MonteCarloResult> {
  const info = STOCK_PRICES[stock] || { price: 1000, dailyVol: 0.02, annualReturn: 0.1 };
  const seed = hashInputs([stock], [stock], { days, numPaths, np: backtestResult.metrics.net_profit });
  const rng = createSeededRandom(seed);

  // Stage 1: Preparing
  onStageChange?.("preparing");
  await new Promise(r => setTimeout(r, 2000 + rng() * 1000));

  // Stage 2: Extract returns from backtest equity curve
  onStageChange?.("extracting_returns");
  await new Promise(r => setTimeout(r, 3000 + rng() * 1500));

  // Derive drift & vol from the backtest equity curve
  const stockResult = backtestResult.stock_results.find(sr => sr.stock === stock);
  const equityCurve = stockResult ? stockResult.equity_curve : backtestResult.equity_curve;
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const ret = Math.log(equityCurve[i].equity / equityCurve[i - 1].equity);
    dailyReturns.push(ret);
  }

  // Use backtest-derived statistics to calibrate GBM
  const empiricalMu = dailyReturns.length > 0
    ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
    : info.annualReturn / 252;
  const empiricalVar = dailyReturns.length > 0
    ? dailyReturns.reduce((s, r) => s + (r - empiricalMu) ** 2, 0) / dailyReturns.length
    : info.dailyVol ** 2;
  const empiricalSigma = Math.sqrt(empiricalVar);

  // Blend backtest-derived params with market params for realism
  const dailyMu = empiricalMu * 0.7 + (info.annualReturn / 252) * 0.3;
  const dailySigma = empiricalSigma * 0.7 + info.dailyVol * 0.3;

  // Skewness from backtest (fat tails)
  const skew = dailyReturns.length > 2
    ? dailyReturns.reduce((s, r) => s + ((r - empiricalMu) / empiricalSigma) ** 3, 0) / dailyReturns.length
    : 0;

  // Stage 3: Calibrating model
  onStageChange?.("calibrating_model");
  await new Promise(r => setTimeout(r, 3000 + rng() * 2000));

  // Stage 4: Run paths with realistic delay
  onStageChange?.("running_paths");

  const allPaths: MonteCarloPath[] = [];
  const priceGrid: number[][] = Array.from({ length: days + 1 }, () => []);
  const batchSize = Math.ceil(numPaths / 20); // 20 batches for ~10s total

  for (let p = 0; p < numPaths; p++) {
    let price = info.price;
    priceGrid[0].push(price);
    if (p < 150) allPaths.push({ day: 0, price, pathId: p });

    for (let d = 1; d <= days; d++) {
      // GBM with skewness adjustment from backtest
      let shock = randomNormal(rng, dailyMu - 0.5 * dailySigma * dailySigma, dailySigma);
      // Add skew from backtest distribution
      if (skew !== 0) shock += skew * 0.01 * (rng() - 0.5);
      // Occasional jump events (regime change)
      if (rng() < 0.02) shock += randomNormal(rng, 0, dailySigma * 2.5);

      price = price * Math.exp(shock);
      price = Math.max(price, info.price * 0.1); // floor at 10% of current
      priceGrid[d].push(price);
      if (p < 150) allPaths.push({ day: d, price: +price.toFixed(2), pathId: p });
    }

    // Progress + realistic delay
    if (p % batchSize === 0) {
      const pathProgress = 30 + (p / numPaths) * 50; // 30% to 80% range
      onProgress?.(pathProgress);
      await new Promise(r => setTimeout(r, 400 + rng() * 200));
    }
  }

  // Stage 5: Computing stats
  onStageChange?.("computing_stats");
  onProgress?.(90);
  await new Promise(r => setTimeout(r, 2000 + rng() * 1000));

  const percentiles = priceGrid.map((prices, day) => {
    const sorted = [...prices].sort((a, b) => a - b);
    const pct = (q: number) => sorted[Math.floor(q * sorted.length)] || sorted[0];
    return {
      day,
      p5: +pct(0.05).toFixed(2),
      p10: +pct(0.10).toFixed(2),
      p25: +pct(0.25).toFixed(2),
      p50: +pct(0.50).toFixed(2),
      p75: +pct(0.75).toFixed(2),
      p90: +pct(0.90).toFixed(2),
      p95: +pct(0.95).toFixed(2),
    };
  });

  const finalPrices = priceGrid[days];
  const profitCount = finalPrices.filter(p => p > info.price).length;
  const sortedFinal = [...finalPrices].sort((a, b) => a - b);
  const cvar5 = sortedFinal.slice(0, Math.floor(sortedFinal.length * 0.05));
  const avgCvar = cvar5.reduce((s, p) => s + p, 0) / cvar5.length;

  onStageChange?.("done");
  onProgress?.(100);

  return {
    stock,
    currentPrice: info.price,
    paths: allPaths,
    percentiles,
    expectedReturn: +((percentiles[days].p50 / info.price - 1) * 100).toFixed(2),
    valueAtRisk95: +((1 - percentiles[days].p5 / info.price) * 100).toFixed(2),
    probabilityOfProfit: +((profitCount / numPaths) * 100).toFixed(1),
    conditionalVaR: +((1 - avgCvar / info.price) * 100).toFixed(2),
    calibration: {
      dailyDrift: +(dailyMu * 100).toFixed(4),
      dailyVol: +(dailySigma * 100).toFixed(4),
      annualizedReturn: +(dailyMu * 252 * 100).toFixed(2),
      annualizedVol: +(dailySigma * Math.sqrt(252) * 100).toFixed(2),
      skewness: +skew.toFixed(3),
      dataPoints: dailyReturns.length,
    },
  };
}

// ========================
// WALK-FORWARD ANALYSIS
// ========================
export async function runWalkForwardAnalysis(
  indicators: string[],
  stockTimeframes: StockTimeframe[],
  config: any,
  numWindows: number,
  onProgress?: (pct: number) => void
): Promise<WalkForwardResult> {
  const pairs = flattenStockTimeframes(stockTimeframes);
  const seed = hashInputs(indicators, pairs.map(p => p.stock), { ...config, wf: numWindows });
  const rng = createSeededRandom(seed);

  const windows: WalkForwardWindow[] = [];
  const baseDate = new Date("2023-01-01");

  for (let w = 0; w < numWindows; w++) {
    const trainStart = new Date(baseDate);
    trainStart.setMonth(trainStart.getMonth() + w * 2);
    const trainEnd = new Date(trainStart);
    trainEnd.setMonth(trainEnd.getMonth() + 6);
    const testStart = new Date(trainEnd);
    testStart.setDate(testStart.getDate() + 1);
    const testEnd = new Date(testStart);
    testEnd.setMonth(testEnd.getMonth() + 2);

    const inSampleReturn = randomBetween(rng, -5, 25);
    const degradation = randomBetween(rng, 0.15, 0.65);
    const outOfSampleReturn = inSampleReturn * (1 - degradation) + randomNormal(rng, 0, 3);

    const inSampleSharpe = randomBetween(rng, 0.3, 2.8);
    const outOfSampleSharpe = inSampleSharpe * (1 - degradation * 0.8) + randomNormal(rng, 0, 0.3);

    windows.push({
      id: w + 1,
      trainStart: trainStart.toISOString().split("T")[0],
      trainEnd: trainEnd.toISOString().split("T")[0],
      testStart: testStart.toISOString().split("T")[0],
      testEnd: testEnd.toISOString().split("T")[0],
      inSampleReturn: +inSampleReturn.toFixed(2),
      outOfSampleReturn: +outOfSampleReturn.toFixed(2),
      inSampleSharpe: +inSampleSharpe.toFixed(2),
      outOfSampleSharpe: +outOfSampleSharpe.toFixed(2),
      inSampleWinRate: +randomBetween(rng, 40, 68).toFixed(1),
      outOfSampleWinRate: +randomBetween(rng, 35, 60).toFixed(1),
      degradation: +degradation.toFixed(2),
    });

    onProgress?.(((w + 1) / numWindows) * 100);
    await new Promise(r => setTimeout(r, 800 + rng() * 400));
  }

  const avgIS = windows.reduce((s, w) => s + w.inSampleReturn, 0) / numWindows;
  const avgOOS = windows.reduce((s, w) => s + w.outOfSampleReturn, 0) / numWindows;
  const avgDeg = windows.reduce((s, w) => s + w.degradation, 0) / numWindows;

  const robustness = Math.max(0, Math.min(100, (1 - avgDeg) * 100));
  const overfitProb = avgDeg > 0.5 ? 75 + rng() * 20 : avgDeg > 0.3 ? 40 + rng() * 20 : 10 + rng() * 20;

  let recommendation: string;
  if (robustness > 70) recommendation = "Strategy shows strong robustness. Safe for live deployment with proper risk management.";
  else if (robustness > 45) recommendation = "Moderate robustness. Consider simplifying the strategy to reduce overfitting before live trading.";
  else recommendation = "High overfitting detected. Strategy performance degrades significantly out-of-sample. Do NOT deploy live.";

  return {
    windows,
    avgInSampleReturn: +avgIS.toFixed(2),
    avgOutOfSampleReturn: +avgOOS.toFixed(2),
    robustnessScore: +robustness.toFixed(1),
    overfitProbability: +overfitProb.toFixed(1),
    recommendation,
  };
}
