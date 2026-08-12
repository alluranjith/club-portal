// Loads the 8 starter markdown files at startup, splits each into sections
// by its "## Heading" markers, and retrieves the most relevant sections for
// a question with simple TF-IDF scoring. Fully offline - no API key needed
// for retrieval.
//
// Answer *phrasing* optionally goes through an AI provider (see claude.js /
// gemini.js) so replies read as well-structured prose/bullets instead of a
// raw doc dump - but the model is only ever shown the retrieved sections
// and is instructed to answer from them alone, never from outside
// knowledge. Providers are tried in order (Claude, then Gemini); if none
// are configured, or all of them fail (rate limit, no internet, etc.),
// this falls back to returning the retrieved section's own text untouched,
// so the app still works fully offline (as the hackathon rubric requires).

const fs = require("fs");
const path = require("path");
const claude = require("./claude");
const gemini = require("./gemini");

// Tried in order. Each entry needs isConfigured() and an async
// complete({system, messages, maxTokens}) -> string. Gemini is tried
// first (primary), Claude is a backup that only kicks in if Gemini fails
// or ANTHROPIC_API_KEY isn't set - handy if you want to keep a Claude key
// in reserve without spending its quota day-to-day. Add more providers
// here (e.g. openai.js) the same way if you want a longer fallback chain.
const PROVIDERS = [
  { name: "gemini", client: gemini },
  { name: "claude", client: claude },
];

const DOCS_DIR = path.join(__dirname, "docs");
const STOPWORDS = new Set(
  "a an the is are was were be been being of to in on for and or with at by from as it this that these those i you he she we they what when where how why do does did can could should would will".split(
    " "
  )
);

const FALLBACK_CONTACT = {
  name: "Shanmukha Sasi Sadineni",
  role: "AWS Student Builder Group Leader",
  email: "sadinenisasi@gmail.com",
  phone: "7396025334",
};

const MATCH_THRESHOLD = 0.08; // below this, we don't trust the retrieval

let sections = []; // { file, heading, text, tokens: Map<term, count> }
let docFreq = new Map(); // term -> number of sections containing it

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(
    (t) => t.length > 1 && !STOPWORDS.has(t)
  );
}

function loadDocuments() {
  sections = [];
  docFreq = new Map();

  const files = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
    const chunks = splitIntoSections(raw);
    for (const chunk of chunks) {
      const bodyTokens = tokenize(chunk.text);
      const headingTokens = tokenize(chunk.heading);
      const counts = new Map();
      for (const t of bodyTokens) counts.set(t, (counts.get(t) || 0) + 1);
      // Heading words are the strongest signal for FAQ-style sections
      // ("When is the next workshop?" as both question and heading), so
      // weight them heavier than body occurrences.
      const HEADING_WEIGHT = 4;
      for (const t of headingTokens) counts.set(t, (counts.get(t) || 0) + HEADING_WEIGHT);
      sections.push({ file, heading: chunk.heading, text: chunk.text, tokens: counts });
    }
  }

  // document frequency for a light IDF weighting
  for (const section of sections) {
    for (const term of section.tokens.keys()) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  console.log(`[search] Loaded ${files.length} documents -> ${sections.length} sections`);
  return { fileCount: files.length, sectionCount: sections.length };
}

function splitIntoSections(raw) {
  const lines = raw.split("\n");
  const chunks = [];
  let currentHeading = "Overview";
  let buffer = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) chunks.push({ heading: currentHeading, text });
    buffer = [];
  };

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    if (h1) {
      flush();
      currentHeading = h1[1].trim();
      continue;
    }
    if (h2) {
      flush();
      currentHeading = h2[1].trim();
      continue;
    }
    buffer.push(line);
  }
  flush();
  return chunks;
}

function scoreSection(section, queryTokens, queryCounts) {
  let score = 0;
  for (const [term, qCount] of queryCounts.entries()) {
    const sCount = section.tokens.get(term);
    if (!sCount) continue;
    const idf = Math.log(1 + sections.length / (1 + (docFreq.get(term) || 0)));
    score += qCount * sCount * idf;
  }
  // normalize a bit by section length so short, precise sections aren't
  // drowned out by long ones
  const sectionLength = Array.from(section.tokens.values()).reduce((a, b) => a + b, 0) || 1;
  return score / Math.sqrt(sectionLength);
}

// Retrieval only - TF-IDF over sections, always local/offline.
function retrieve(question) {
  if (sections.length === 0) loadDocuments();

  const queryTokens = tokenize(question);
  const queryCounts = new Map();
  for (const t of queryTokens) queryCounts.set(t, (queryCounts.get(t) || 0) + 1);

  if (queryTokens.length === 0) {
    return { top: [], confidence: 0 };
  }

  const scored = sections
    .map((section) => ({ section, score: scoreSection(section, queryTokens, queryCounts) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 3);
  const bestScore = top[0]?.score || 0;

  // normalize against the query's own weight so threshold is stable
  // regardless of question length
  const selfScore =
    Array.from(queryCounts.entries()).reduce((acc, [term, qCount]) => {
      const idf = Math.log(1 + sections.length / (1 + (docFreq.get(term) || 0)));
      return acc + qCount * qCount * idf;
    }, 0) || 1;
  const confidence = bestScore / Math.sqrt(selfScore);

  return { top, confidence };
}

async function answerQuestion(question) {
  const { top, confidence } = retrieve(question);

  // No overlapping terms with any doc at all - definitely not covered,
  // skip straight to the fallback without spending an API call on it.
  if (top.length === 0) {
    return fallbackAnswer();
  }

  const sources = top.map((t) => ({
    file: t.section.file,
    section: t.section.heading,
  }));

  const configuredProviders = PROVIDERS.filter((p) => p.client.isConfigured());

  if (configuredProviders.length > 0) {
    // With an AI provider available, don't hard-gate on the numeric TF-IDF
    // confidence score - a short question like "why AWS?" can have weak
    // keyword overlap (common words score low) while still being clearly
    // answerable from the retrieved sections. Let the model itself judge
    // relevance: the system prompt requires it to return the exact
    // fallback sentence if the context doesn't actually answer the
    // question, so grounding is preserved either way.
    for (const provider of configuredProviders) {
      try {
        const answer = await phraseAnswer(provider.client, question, top);
        if (isFallbackText(answer)) {
          return fallbackAnswer();
        }
        return { answer, sources, fellBack: false };
      } catch (err) {
        console.warn(`[search] ${provider.name} failed, trying next option:`, err.message);
      }
    }
    // Every configured provider failed (rate limit, network, etc). Fall
    // through to the strict local behavior below rather than showing a
    // low-confidence raw doc dump.
  }

  if (confidence < MATCH_THRESHOLD) {
    return fallbackAnswer();
  }

  // No provider configured, or all of them failed - fall back to the
  // retrieved section's own text, untouched. The app still works fully
  // offline.
  return { answer: summarizeSection(top[0].section.text), sources, fellBack: false };
}

function isFallbackText(text) {
  return text.trim().replace(/^"|"$/g, "") === fallbackAnswer().answer.trim();
}

async function phraseAnswer(client, question, topSections) {
  const context = topSections
    .map(
      (t, i) =>
        `[Source ${i + 1}: ${t.section.file} § ${t.section.heading}]\n${t.section.text.trim()}`
    )
    .join("\n\n---\n\n");

  const system = [
    "You are the chat assistant for a university AWS Student Builder Groups club portal.",
    "Answer the member's question using ONLY the CONTEXT sections provided below - never use",
    "outside knowledge, and never invent AWS pricing, limits, or policy details that aren't",
    "explicitly in the context.",
    "If the context doesn't actually answer the question, respond with exactly this sentence and",
    `nothing else: "${fallbackAnswer().answer}"`,
    "Otherwise, write a clear, well-structured answer: short paragraphs and/or a tight bullet",
    "list, plain language, no more than about 120 words. Do not mention 'the context' or 'the",
    "documents' explicitly, and do not add your own source citations or links - those are shown",
    "separately by the app.",
    "",
    "CONTEXT:",
    context,
  ].join("\n");

  return client.complete({
    system,
    messages: [{ role: "user", content: question }],
    maxTokens: 2048,
  });
}

function summarizeSection(text) {
  // Return the section's own text (trimmed) as the answer, since we're
  // answering only from the documents and never generating new claims.
  return text.trim();
}

function fallbackAnswer() {
  return {
    answer:
      `I could not find that in the club documents. Please contact ${FALLBACK_CONTACT.name}, ` +
      `${FALLBACK_CONTACT.role}, at ${FALLBACK_CONTACT.email} or ${FALLBACK_CONTACT.phone}.`,
    sources: [],
    fellBack: true,
  };
}

module.exports = { loadDocuments, answerQuestion, FALLBACK_CONTACT };
