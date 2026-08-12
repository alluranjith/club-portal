import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearSession, getStoredUser } from "../api.js";

const DOC_PACK = [
  { file: "01-onboarding-faq.md", about: "New member FAQ + club directory" },
  { file: "02-aws-account-setup.md", about: "AWS account and billing" },
  { file: "03-builder-center-publish.md", about: "Publish on Builder Center" },
  { file: "04-bedrock-starter.md", about: "Getting started with Bedrock" },
  { file: "05-hackathon-rules.md", about: "Hackathon rules" },
  { file: "06-workshop-index.md", about: "Past workshops" },
  { file: "07-lambda-patterns.md", about: "Serverless API notes" },
  { file: "08-sbg-community.md", about: "About Student Builder Groups + chapter leads" },
];

const SUGGESTED = [
  "When is the next workshop?",
  "How do I publish on Builder Center?",
  "What's the AWS free tier EC2 limit?",
  "Who do I contact if I'm stuck?",
];

export default function Chat() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const historyRef = useRef(null);

  // Restore this member's past conversation on load, so refreshing or
  // logging back in doesn't lose it.
  useEffect(() => {
    (async () => {
      try {
        const { history } = await api.history();
        const restored = [];
        for (const h of history) {
          restored.push({ from: "user", text: h.question });
          restored.push({ from: "bot", text: h.answer, sources: h.sources, fellBack: h.fellBack });
        }
        setMessages(restored);
      } catch (err) {
        console.warn("Could not load chat history:", err.message);
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, asking]);

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  async function ask(question) {
    if (!question.trim() || asking) return;
    setInput("");
    setMessages((m) => [...m, { from: "user", text: question }]);
    setAsking(true);
    try {
      const res = await api.ask(question);
      setMessages((m) => [
        ...m,
        { from: "bot", text: res.answer, sources: res.sources, fellBack: res.fellBack },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { from: "bot", text: err.message, sources: [], fellBack: true }]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark">CP</span>
          Club Member Portal
          <span className="brand-sub">AWS Student Builder Groups</span>
        </div>
        <div className="topbar-user">
          {user?.name}
          <button className="btn btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="chat-layout">
        <div className="chat-main">
          <div className="chat-history" ref={historyRef}>
            {historyLoaded && messages.length === 0 && (
              <div className="chat-empty">
                <h2>Ask the club bot anything</h2>
                <p>
                  Answers come only from the {DOC_PACK.length} starter documents loaded below,
                  with the source cited on every reply.
                </p>
                <div className="suggested-qs">
                  {SUGGESTED.map((q) => (
                    <button key={q} className="suggested-q" onClick={() => ask(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`msg-row from-${m.from} ${m.fellBack ? "fell-back" : ""}`}>
                <div className="msg-bubble">
                  {m.text}
                  {m.sources?.length > 0 && (
                    <div className="citations">
                      {m.sources.map((s, j) => (
                        <span className="citation-chip" key={j}>
                          {s.file} <span className="sep">§</span> {s.section}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {asking && <div className="thinking">searching club documents…</div>}
          </div>

          <form
            className="chat-composer"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about workshops, AWS setup, the hackathon…"
              disabled={asking}
            />
            <button className="btn btn-primary" disabled={asking || !input.trim()}>
              Send
            </button>
          </form>
        </div>

        <div className="docs-panel">
          <h3>Loaded document pack</h3>
          {DOC_PACK.map((d) => (
            <div className="doc-item" key={d.file}>
              <span className="doc-check">✓</span>
              <div>
                <div className="doc-name">{d.file}</div>
                <div className="doc-about">{d.about}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
