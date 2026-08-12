require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { connectDB } = require("./db");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const { loadDocuments } = require("./search");
const requireAuth = require("./middleware/requireAuth");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

let loadStats = { fileCount: 0, sectionCount: 0 };

app.get("/api/health", (req, res) => {
  res.json({ ok: true, docs: loadStats });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// Simple "who am I" check the frontend uses to confirm a stored token is
// still valid before showing the chat page.
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

async function start() {
  await connectDB();
  // Load the 8-file starter pack into the search index at startup, as required.
  loadStats = loadDocuments();

  app.listen(PORT, () => {
    console.log(`Club Portal API listening on http://localhost:${PORT}`);
    console.log(`Loaded ${loadStats.fileCount} docs into ${loadStats.sectionCount} searchable sections`);
  });
}

start().catch((err) => {
  console.error("Failed to start server - is MongoDB running and MONGODB_URI correct?");
  console.error(err.message);
  process.exit(1);
});
