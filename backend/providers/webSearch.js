const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export function isWebSearchConfigured() {
  return Boolean(TAVILY_API_KEY);
}

export async function searchWeb(query, maxResults = 5, { signal } = {}) {
  if (!TAVILY_API_KEY) throw new Error("Chưa cấu hình TAVILY_API_KEY.");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: maxResults,
      include_answer: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tavily lỗi ${res.status}: ${text}`);
  }

  const data = await res.json();
  return (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    content: (r.content || "").slice(0, 1000),
  }));
}
