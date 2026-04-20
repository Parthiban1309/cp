import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Bot, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendGroqMessage, buildSystemPrompt, type ChatMessage } from "@/services/groqChat";
import type { BacktestResult, MonteCarloResult, WalkForwardResult } from "@/types/backtest";
import { toast } from "sonner";

interface Props {
  backtestResult: BacktestResult | null;
  monteCarloResult: MonteCarloResult | null;
  walkForwardResult: WalkForwardResult | null;
}

function buildContext(bt: BacktestResult | null, mc: MonteCarloResult | null, wf: WalkForwardResult | null): string {
  const sections: string[] = [];

  if (bt) {
    const m = bt.metrics;
    sections.push(`## Backtest Results
- Net Profit: ₹${m.net_profit.toLocaleString()} | Win Rate: ${m.win_rate}% | Profit Factor: ${m.profit_factor}
- Total Trades: ${m.total_trades} (${m.winning_trades}W / ${m.losing_trades}L)
- Max Drawdown: ${m.max_drawdown}% | Sharpe: ${m.sharpe_ratio} | CAGR: ${m.cagr}%
- Avg Win: ₹${m.avg_win} | Avg Loss: ₹${m.avg_loss} | Expectancy: ₹${m.expectancy}
- Total Charges: ₹${bt.charge_ledger.grand_total}
- Stocks tested: ${bt.stock_results.map(s => s.label).join(", ")}`);

    bt.stock_results.forEach(sr => {
      sections.push(`### ${sr.label}: Net ₹${sr.metrics.net_profit} | WR ${sr.metrics.win_rate}% | PF ${sr.metrics.profit_factor} | DD ${sr.metrics.max_drawdown}%`);
    });
  }

  if (mc) {
    sections.push(`## Monte Carlo Simulation (${mc.stock})
- Current Price: ₹${mc.currentPrice} | Expected Return: ${mc.expectedReturn}%
- VaR (95%): ${mc.valueAtRisk95}% | CVaR: ${mc.conditionalVaR}%
- Probability of Profit: ${mc.probabilityOfProfit}%
- Calibration: Daily Drift ${mc.calibration.dailyDrift}%, Daily Vol ${mc.calibration.dailyVol}%, Skew ${mc.calibration.skewness}
- Annualized: Return ${mc.calibration.annualizedReturn}%, Vol ${mc.calibration.annualizedVol}%`);
  }

  if (wf) {
    sections.push(`## Walk-Forward Analysis
- Robustness Score: ${wf.robustnessScore}% | Overfit Probability: ${wf.overfitProbability}%
- Avg IS Return: ${wf.avgInSampleReturn}% | Avg OOS Return: ${wf.avgOutOfSampleReturn}%
- Recommendation: ${wf.recommendation}
- Windows: ${wf.windows.map(w => `#${w.id}: IS ${w.inSampleReturn}% → OOS ${w.outOfSampleReturn}% (deg ${(w.degradation * 100).toFixed(0)}%)`).join(" | ")}`);
  }

  return sections.length > 0 ? sections.join("\n\n") : "No backtest or simulation data available yet. The user hasn't run any analysis.";
}

const QUICK_PROMPTS = [
  "Analyze my backtest performance",
  "How can I improve win rate?",
  "Is my strategy overfitting?",
  "Suggest risk management changes",
  "Compare stock performances",
];

export function AIChatbot({ backtestResult, monteCarloResult, walkForwardResult }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || !messagesContainerRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (!container) return;
      container.scrollTop = container.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const context = buildContext(backtestResult, monteCarloResult, walkForwardResult);
    const systemMsg: ChatMessage = { role: "system", content: buildSystemPrompt(context) };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let assistantText = "";
    const updateAssistant = (chunk: string) => {
      assistantText += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
        }
        return [...prev, { role: "assistant", content: assistantText }];
      });
    };

    try {
      const history = [...messages, userMsg].filter(m => m.role !== "system");
      await sendGroqMessage(
        [systemMsg, ...history],
        updateAssistant,
        () => setLoading(false)
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const displayMessages = messages.filter(m => m.role !== "system");

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[520px] max-h-[calc(100vh-6rem)] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
            <img
              src="/alpha-insight-logo.svg"
              alt="Alpha Insight Lab logo"
              className="h-5 w-5 shrink-0"
            />
            <span className="text-sm font-semibold text-foreground">Alpha Insight AI</span>
            <span className="text-[10px] font-mono text-muted-foreground ml-1">Groq · LLaMA 3.3</span>
            <button
              onClick={() => setMessages([])}
              className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
              title="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-3 scrollbar-thin"
          >
            <div className="space-y-3">
              {displayMessages.length === 0 && (
                <div className="text-center py-6 space-y-3">
                  <Bot className="h-8 w-8 mx-auto text-primary/50" />
                  <p className="text-xs text-muted-foreground">Ask me anything about your backtest results, Monte Carlo simulations, or strategy optimization.</p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {QUICK_PROMPTS.map(p => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        className="text-[10px] px-2.5 py-1.5 rounded-full border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {displayMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && <Bot className="h-4 w-4 mt-1 text-primary flex-shrink-0" />}
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/70 text-secondary-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && <User className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />}
                </div>
              ))}

              {loading && displayMessages[displayMessages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-2 items-center">
                  <Bot className="h-4 w-4 text-primary" />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border p-2.5 flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your strategy..."
              rows={1}
              className="flex-1 resize-none bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              size="sm"
              className="h-auto px-3"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
