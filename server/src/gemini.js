// Minimal Gemini API client (Google AI Studio) using Node's built-in
// fetch. Used as an automatic fallback if Claude is unavailable or
// rate-limited - same "answer only from this context" contract as claude.js.

const DEFAULT_MODEL = "gemini-3.5-flash";

function isConfigured() {
  return Boolean(process.env.GOOGLE_API_KEY);
}

async function complete({ system, messages, maxTokens = 500 }) {
  if (!isConfigured()) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_API_KEY}`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini API returned no text content");
  }

  return text;
}

module.exports = { complete, isConfigured };
