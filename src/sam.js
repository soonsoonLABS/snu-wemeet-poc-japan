const SAM_API_KEY = "sam-45ae2ebb0617e7963d9d47f2db3ae47f306786e9b1ce9f98";
const SAM_BASE_URL = "https://sam.soonsoon.ai";

export async function samSearch(query, strategy = "balanced") {
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

  return response.json();
}

export async function samGenerate(model, messages, options = {}) {
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
    const content = processResult?.output?.content || processResult?.choices?.[0]?.message?.content || "";
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
  // Handle various SAM search response formats
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
      .map((r) => `제목: ${r.title}\nURL: ${r.url}\n내용: ${r.snippet || r.content}`)
      .join("\n\n---\n\n");
  }
  // Fallback: stringify the whole thing
  return JSON.stringify(result, null, 2).slice(0, 4000);
}
