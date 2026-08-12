const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const store = require("../store");
const { answerQuestion } = require("../search");

const router = express.Router();

// Members-only: ask a question, get an answer grounded in the club docs,
// and persist the exchange to this member's chat history.
router.post("/", requireAuth, async (req, res) => {
  const { question } = req.body || {};

  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Ask a question first." });
  }

  try {
    const result = await answerQuestion(question.trim());

    try {
      await store.saveChatMessage({
        userId: req.user.id,
        question: question.trim(),
        answer: result.answer,
        sources: result.sources,
        fellBack: result.fellBack,
      });
    } catch (saveErr) {
      // Don't fail the request just because history couldn't be saved.
      console.warn("[chat] failed to save chat history:", saveErr.message);
    }

    res.json({
      question: question.trim(),
      answer: result.answer,
      sources: result.sources,
      fellBack: result.fellBack,
      askedBy: req.user.name,
      askedAt: Date.now(),
    });
  } catch (err) {
    console.error("[chat] failed to answer question:", err);
    res.status(500).json({ error: "Something went wrong answering that. Please try again." });
  }
});

// Members-only: this member's past exchanges, oldest first, so the chat
// page can restore the conversation on login/reload.
router.get("/history", requireAuth, async (req, res) => {
  try {
    const docs = await store.getChatHistory(req.user.id);
    res.json({
      history: docs.map((d) => ({
        question: d.question,
        answer: d.answer,
        sources: d.sources,
        fellBack: d.fellBack,
        askedAt: d.askedAt,
      })),
    });
  } catch (err) {
    console.error("[chat] failed to load history:", err);
    res.status(500).json({ error: "Could not load chat history." });
  }
});

module.exports = router;
