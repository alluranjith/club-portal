// Minimal Anthropic Messages API client using Node's built-in fetch
// (Node 18+, already required by package.json engines). No SDK dependency
// needed for this one call.

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-3-5-sonnet-latest";

function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function complete({ system, messages, maxTokens = 500 }) {
  if (!isConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic API returned no text content");
  }

  return text;
}

module.exports = { complete, isConfigured };
