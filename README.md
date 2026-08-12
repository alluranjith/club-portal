# Club Member Portal — 70% Baseline

AWS Student Builder Groups · Campus Hackathon

A members-only portal where new club members sign up, log in, and chat with
a bot that answers **only** from an 8-file starter document pack, citing the
source file and section on every reply. When a question isn't covered by
the docs, the bot replies with a fallback that points to the campus AWS
Student Builder contact — never a guess.

Runs entirely locally. No AWS account, API key, or internet connection is
required to build and demo it (see [Deploying on AWS](#deploying-on-aws)
for what a cloud version would look like).

## Stack

- **Backend:** Node.js + Express, JWT auth, bcrypt password hashing,
  **MongoDB** (via Mongoose) for users, password resets, and per-user chat
  history, and a dependency-free keyword/TF-IDF search engine over the
  starter docs.
- **Frontend:** React + Vite + React Router.
- **Chat "AI":** offline TF-IDF-style retrieval over the 8 markdown files,
  optionally phrased by Gemini and/or Claude — see
  [Well-structured answers with AI](#well-structured-answers-with-ai-optional-with-automatic-failover).

## Project layout

```
club-portal/
  server/               Express API
    src/
      index.js           app entry
      db.js               MongoDB connection
      models/             Mongoose schemas (User, PasswordReset, ChatMessage)
      routes/auth.js      signup, login, forgot/reset password
      routes/chat.js      members-only chat + history endpoints
      search.js           doc loader + retrieval + citations
      claude.js            Claude API client (optional)
      gemini.js            Gemini API client (optional)
      mailer.js           password-reset email (Ethereal test inbox in dev)
      store.js             MongoDB data access layer
      docs/               the 8 starter documents, loaded at startup
  client/               React app (Vite)
    src/
      pages/              Login, Signup, Forgot, Reset, Chat
      api.js              fetch wrapper + session storage
  templates/
    aws-builder-center-article.md   required article template
  DEPLOY_AWS.md          step-by-step guide for the optional AWS deployment
```

## Setup

Requires Node 18+ and a MongoDB instance.

**0. MongoDB**

Easiest local option — run it in Docker:

```bash
docker run -d --name club-portal-mongo -p 27017:27017 mongo:7
```

Or install MongoDB Community Server locally: https://www.mongodb.com/docs/manual/installation/

Either way, the default `MONGODB_URI` in `.env.example` (`mongodb://127.0.0.1:27017/club-portal`)
just works — no manual database/collection creation needed, Mongoose
creates them on first write.

**1. Backend**

```bash
cd server
cp .env.example .env      # edit JWT_SECRET if you want; defaults work for a demo
npm install
npm run dev                # http://localhost:4000
```

**2. Frontend**

```bash
cd client
npm install
npm run dev                # http://localhost:5173
```

Open http://localhost:5173, sign up with any email/password (8+ characters),
and start asking the bot questions.

## Demo flow (matches the rubric)

1. Sign up → land on the chat page.
2. Ask a question covered by the docs (e.g. "When is the next workshop?")
   → answer shows the source file and section.
3. Ask something not in the docs (e.g. "What's the capital of France?") →
   fallback message with the campus AWS Student Builder contact.
4. Log out, click **Forgot password** → request a reset. In dev mode
   (no SMTP configured), the reset code and link are shown directly in the
   UI and logged to the server console, so you can demo the full flow
   without a real inbox.
5. Reset the password, log back in.
6. Notice your earlier questions are still there — chat history is saved
   per member in MongoDB and reloaded automatically when you log back in.

## How the chatbot stays grounded

`server/src/search.js` loads all 8 files in `server/src/docs/` at startup,
splits each into sections by its `##` headings, and scores sections against
the question using term-frequency + inverse-document-frequency (heading
words are weighted higher, since these are FAQ-style docs). The top
section's own text is returned as the answer — the bot never generates new
text, so it can't invent AWS pricing, limits, or policy. If the best match
is too weak, it returns the fallback contact from `01-onboarding-faq.md`
instead of guessing.

**Replacing the starter pack:** the 8 files here are placeholders written to
match the descriptions in the hackathon brief. Drop the real starter pack
into `server/src/docs/`, keep the same filenames (or update
`client/src/pages/Chat.jsx`'s `DOC_PACK` list to match), and restart the
server.

## Well-structured answers with AI (optional, with automatic failover)

By default the bot replies with the raw text of the best-matching doc
section — accurate and cited, but not always nicely phrased. Add an API
key and it'll phrase clean, well-structured answers instead (short
paragraphs / tight bullet points), while staying strictly grounded:

1. Gemini (Google AI Studio) — the primary. Get a key at
   https://aistudio.google.com/apikey → set `GOOGLE_API_KEY` in
   `server/.env`
2. Anthropic (Claude) — optional backup. Get a key at
   https://console.anthropic.com → set `ANTHROPIC_API_KEY` in
   `server/.env`
3. Restart `npm run dev` in `server/`

**Gemini is tried first on every question.** Claude is only ever called if
Gemini fails (rate limit, quota, briefly down) or `GOOGLE_API_KEY` isn't
set — so you can leave `ANTHROPIC_API_KEY` blank and it's never touched, or
fill it in later purely as a safety net without spending its quota
day-to-day. If neither responds (or neither key is set), it falls back to
the raw doc text, so the app still works fully offline either way.

How it stays grounded regardless of which provider answers: retrieval
(`server/src/search.js`) still runs first and picks the top matching
section(s) exactly as before — that's what decides the citations and
whether to fall back at all. Only if a real match is found does the app
send those retrieved sections to whichever provider's turn it is
(`server/src/claude.js`, `server/src/gemini.js`), with a system prompt that
says to answer *only* from that context, never invent AWS pricing/limits/
policy, and to return the exact fallback sentence if the context doesn't
actually cover the question.

To add a third provider (e.g. OpenAI) to the failover chain, write a module
matching the same `{ isConfigured(), complete({system, messages, maxTokens}) }`
shape as `claude.js`/`gemini.js` and add it to the `PROVIDERS` list at the
top of `search.js`.

This mirrors the RAG pattern described in `04-bedrock-starter.md` (retrieve
relevant chunks, then let the model phrase an answer from them) — moving to
Bedrock Knowledge Bases later is a drop-in swap for a Bedrock Converse API
call.

## Deploying on AWS

Local demo is what the rubric expects — this is the pitch/article mapping.
For a full step-by-step guide to actually deploying it (for the optional
bonus marks), see **[DEPLOY_AWS.md](./DEPLOY_AWS.md)**.

| Local prototype piece | AWS service |
| --- | --- |
| Email/password auth (JWT) | Amazon Cognito user pools |
| Password reset email | Amazon SES |
| Starter document pack | Amazon S3 |
| Document search / RAG | Amazon Bedrock Knowledge Bases |
| Chat + auth API (Express) | AWS Lambda behind API Gateway, Cognito authorizer |
| AI answers | Amazon Bedrock (Anthropic Claude models) |
| Users, resets, chat history (MongoDB) | MongoDB Atlas (AWS-hosted region) or Amazon DocumentDB |

See `server/src/docs/07-lambda-patterns.md` for notes on migrating Express
route handlers to individual Lambda functions.

## Builder Center

Every team publishes a Builder Center article. Start from
`templates/aws-builder-center-article.md` — lead with screenshots (signup,
login, forgot password, chat with a cited answer), then the AWS deployment
table above, then tag with `#aws-student-builders-groups #buildonaws
#amazon-bedrock #rag`.

## Notes

- Passwords are hashed with bcrypt; plaintext passwords and private student
  data are never logged.
- All data (users, password resets, chat history) lives in your MongoDB
  instance — nothing is written to disk as flat files anymore. Point
  `MONGODB_URI` at a local `mongod`, Docker container, or a MongoDB Atlas
  cluster; the app code doesn't change either way.
- This is the 70% baseline only. The 30% problem statement is shared on
  hackathon day and isn't included here.
