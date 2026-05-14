const SAM_API_KEY = "sam-45ae2ebb0617e7963d9d47f2db3ae47f306786e9b1ce9f98";
const SAM_BASE_URL = "https://sam.soonsoon.ai";

// Usage tracker - persists in sessionStorage
const USAGE_KEY = "sam_usage_log";

function getUsageLog() {
  try {
    return JSON.parse(sessionStorage.getItem(USAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsageLog(log) {
  sessionStorage.setItem(USAGE_KEY, JSON.stringify(log));
}

export function logUsage(entry) {
  const log = getUsageLog();
  log.push({ ...entry, timestamp: new Date().toISOString() });
  saveUsageLog(log);
}

export function getUsageStats() {
  const log = getUsageLog();
  const stats = {
    totalCalls: log.length,
    searchCalls: log.filter((e) => e.type === "search").length,
    generateCalls: log.filter((e) => e.type === "generate").length,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCost: 0,
    entries: log,
  };

  for (const entry of log) {
    if (entry.usage) {
      stats.totalInputTokens += entry.usage.input_tokens || entry.usage.prompt_tokens || 0;
      stats.totalOutputTokens += entry.usage.output_tokens || entry.usage.completion_tokens || 0;
    }
    if (entry.cost) {
      stats.estimatedCost += entry.cost;
    }
  }

  return stats;
}

export function clearUsageLog() {
  sessionStorage.removeItem(USAGE_KEY);
}

// Cost estimation per model ($/1M tokens)
const MODEL_COSTS = {
  "claude-haiku": { input: 1.10, output: 5.50 },
  "claude-sonnet-4.6": { input: 3.30, output: 16.50 },
  "gpt-5.4-nano": { input: 0.20, output: 1.25 },
  "glm-4.7-flash": { input: 0.06, output: 0.40 },
  "deepseek-v3.2": { input: 0.62, output: 1.85 },
};

function estimateCost(model, usage) {
  const rates = MODEL_COSTS[model] || { input: 1.0, output: 5.0 };
  const inputTokens = usage?.input_tokens || usage?.prompt_tokens || 0;
  const outputTokens = usage?.output_tokens || usage?.completion_tokens || 0;
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

export async function samSearch(query, strategy = "balanced") {
  const startTime = Date.now();

  const response = await fetch(`${SAM_BASE_URL}/v1/search/agent`, {
    method: "POST",
    headers: {
      "X-API-Key": SAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      strategy,
      execute: true,
      locale: "ko-KR",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SAM Search ${response.status}: ${text}`);
  }

  const data = await response.json();
  const elapsed = Date.now() - startTime;

  // Log usage
  logUsage({
    type: "search",
    endpoint: "/v1/search/agent",
    strategy,
    query,
    elapsed,
    usage: data.usage || null,
    cost: data.usage ? estimateCost("claude-haiku", data.usage) : 0.005, // estimate ~$0.005 per search
    model: data.model || "search-agent",
    provider: data.provider || "auto",
  });

  return data;
}

export async function samGenerate(model, messages, options = {}) {
  const startTime = Date.now();

  const response = await fetch(`${SAM_BASE_URL}/v1/generate`, {
    method: "POST",
    headers: {
      "X-API-Key": SAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      options: { stream: false, ...options },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SAM Generate ${response.status}: ${text}`);
  }

  const data = await response.json();
  const elapsed = Date.now() - startTime;

  // Extract usage from response
  const usage = data.usage || data.output?.usage || null;

  logUsage({
    type: "generate",
    endpoint: "/v1/generate",
    model,
    elapsed,
    usage,
    cost: usage ? estimateCost(model, usage) : 0,
  });

  return data;
}

export async function samAccount() {
  const response = await fetch(`${SAM_BASE_URL}/v1/account`, {
    method: "GET",
    headers: {
      "X-API-Key": SAM_API_KEY,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function searchAndProcess(topic) {
  // Step 1: Search for Japanese safety/education content
  const searchResult = await samSearch(
    `${topic} 일본 산업안전 교육 최신 동향 2024 2025`,
    "balanced"
  );

  // Step 2: Translate and summarize with AI
  const searchContent = extractSearchContent(searchResult);

  if (!searchContent) {
    return {
      search: searchResult,
      processed: null,
      error: "검색 결과가 없습니다.",
    };
  }

  const processResult = await samGenerate("claude-haiku", [
    {
      role: "system",
      content: `당신은 일본 산업안전·교육 분야 전문 분석가입니다.
주어진 검색 결과를 분석하여 다음 형식으로 정리해주세요:

1. 각 항목을 한국어로 번역
2. 핵심 내용 3줄 요약
3. 카테고리 분류 (산업안전/교육정책/법규변경/사고사례/기술동향 중 택1)
4. 중요도 (상/중/하)

JSON 배열로 응답하세요:
[{"title":"제목","summary":"요약","category":"카테고리","importance":"중요도","source":"출처URL","date":"날짜"}]`,
    },
    {
      role: "user",
      content: `다음 검색 결과를 분석해주세요:\n\n${searchContent}`,
    },
  ]);

  let processed = null;
  try {
    const content =
      processResult?.output?.content ||
      processResult?.choices?.[0]?.message?.content ||
      "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      processed = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    processed = null;
  }

  return { search: searchResult, processed };
}

function extractSearchContent(result) {
  if (result?.result?.answer) {
    return result.result.answer;
  }
  if (result?.result?.content) {
    return result.result.content;
  }
  if (result?.answer) {
    return result.answer;
  }
  if (result?.results && Array.isArray(result.results)) {
    return result.results
      .map(
        (r) =>
          `제목: ${r.title}\nURL: ${r.url}\n내용: ${r.snippet || r.content}`
      )
      .join("\n\n---\n\n");
  }
  return JSON.stringify(result, null, 2).slice(0, 4000);
}
