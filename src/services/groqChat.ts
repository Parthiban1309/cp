const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function sendGroqMessage(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  onDone: () => void
) {
  if (!GROQ_API_KEY) {
    throw new Error("Missing VITE_GROQ_API_KEY. Set it in a local .env file.");
  }

  const resp = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!resp.ok || !resp.body) {
    const errText = await resp.text().catch(() => "Unknown error");
    throw new Error(`Groq API error (${resp.status}): ${errText}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

export function buildSystemPrompt(context: string): string {
  return `You are Alpha Insight AI, an expert quantitative trading analyst assistant embedded in Alpha Insight Lab, a backtesting platform for Indian NSE stocks.

You have access to the following backtest and simulation data context:
${context}

Guidelines:
- Give specific, actionable trading strategy advice based on the data provided
- Reference actual numbers from the data (win rates, drawdowns, Sharpe ratios, and similar metrics)
- Suggest concrete parameter changes (for example, "increase stop-loss from 1.5% to 2.5%")
- Explain concepts clearly but stay concise
- When discussing Monte Carlo results, reference VaR, probability of profit, and confidence cones
- When discussing Walk-Forward results, reference robustness scores and degradation
- Format responses with clear sections using markdown
- Always ground your analysis in the actual data, never fabricate numbers
- Use rupees for currency values
- Be direct and professional with no fluff`;
}
