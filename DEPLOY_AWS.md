# Deploying on AWS (optional — bonus marks only)

The hackathon rubric only requires that you **explain** how this would
deploy on AWS, in your pitch and Builder Center article — a local demo is
enough to compete. This guide covers both: a short version for the article,
and real steps if you want to actually deploy it for the bonus.

---

## The five things to explain (article/pitch checklist)

Cover each of these — this maps directly to what the rubric asks for:

### 1. Login → Amazon Cognito

Cognito replaces the current email/password + JWT code
(`server/src/routes/auth.js`, `security.js`) with a managed user pool.

- Create a **Cognito User Pool**, enable email/password sign-in.
- The React app calls Cognito directly (via `amazon-cognito-identity-js`
  or AWS Amplify's Auth module) instead of `/api/auth/signup` and
  `/api/auth/login`.
- Cognito issues its own JWT (an ID token) — your API verifies that token
  instead of one you signed yourself.
- Forgot-password becomes a built-in Cognito flow (`forgotPassword` /
  `confirmForgotPassword`), which is where SES comes in next.

### 2. Password-reset emails → Amazon SES

Cognito uses SES under the hood to send the verification code for its
built-in forgot-password flow — no custom `mailer.js`/Nodemailer needed.

- Verify a domain or sender email in **SES**.
- Move SES out of the sandbox (request production access) so you can email
  addresses that aren't pre-verified — required before real members can
  use it.
- Point your Cognito User Pool's email configuration at SES.

### 3. Document storage → Amazon S3

- Create an S3 bucket (e.g. `club-portal-docs`).
- Upload the 8 starter markdown files there instead of bundling them in
  `server/src/docs/`.
- At startup (or via a scheduled Lambda), the API reads the files from S3
  instead of the local filesystem — one line change in `search.js`'s
  `loadDocuments()` (swap `fs.readFileSync` for an S3 `GetObject` call).

### 4. Chat + auth API → Lambda + API Gateway

- Each Express route (`/api/auth/*`, `/api/chat/*`) becomes a Lambda
  function, or the whole Express app runs behind one Lambda using
  `serverless-http` (minimal code change, wraps the existing `app` object).
- **API Gateway** sits in front, with a **Cognito authorizer** attached to
  the chat routes — this replaces the `requireAuth` middleware, since API
  Gateway rejects unauthenticated requests before they reach your code.
- See `server/src/docs/07-lambda-patterns.md` for the migration notes this
  local build already ships with.

### 5. AI answers → Amazon Bedrock

- The current app calls Gemini and/or Claude directly from `search.js`
  (`gemini.js` / `claude.js`). On AWS, the natural swap is **Amazon
  Bedrock**, which gives you Anthropic's Claude models through one managed
  API with no key management (IAM handles auth instead).
- For retrieval, **Bedrock Knowledge Bases** can replace the local TF-IDF
  search entirely: point it at the S3 bucket from step 3, and it handles
  chunking, embedding, and retrieval for you — `04-bedrock-starter.md` in
  the doc pack describes this exact pattern.
- Either way, the "answer only from retrieved context, fall back to the
  campus contact otherwise" logic in `search.js` stays the same — only
  where the context comes from and which API phrases the answer changes.

### Data: MongoDB Atlas

Not explicitly in the rubric's five items, but worth a line in your
article: **MongoDB Atlas** (MongoDB's own managed cloud service, available
on AWS infrastructure) is the natural home for `MONGODB_URI` in
production — same connection string swap as any other environment, no
code changes. Amazon DocumentDB (Mongo-compatible) is the alternative if
you want to stay fully inside AWS-native services instead.

---

## If you want to actually deploy it (bonus marks)

You don't need Cognito/Lambda/Bedrock to get *some* bonus credit — the
rubric says "live AWS deployment," not "the full serverless rewrite above."
The fastest real path that's still genuinely running on AWS:

### Fast path (~30–45 min, minimal code changes)

1. **Database:** create a free MongoDB Atlas cluster
   (https://www.mongodb.com/cloud/atlas/register) — takes about 5 minutes,
   no AWS account needed for this part. Copy the connection string.
2. **Backend:** deploy `server/` to **AWS Elastic Beanstalk** (Node.js
   platform) or a single **EC2** instance:
   - Elastic Beanstalk: `eb init`, `eb create`, then set `MONGODB_URI`,
     `JWT_SECRET`, `CLIENT_ORIGIN`, and your `GOOGLE_API_KEY`/
     `ANTHROPIC_API_KEY` as environment variables in the EB console.
   - EC2: launch a small instance, install Node 18+, `git clone` your repo,
     `npm install`, run with `pm2` so it survives reboots, open port 4000
     in the security group (or put it behind nginx on 443).
3. **Frontend:** run `npm run build` in `client/`, then host the static
   `dist/` folder on **S3 + CloudFront** (or **AWS Amplify Hosting**, which
   can build straight from your GitHub repo with zero config).
4. Update `CLIENT_ORIGIN` on the backend and the API base URL in the
   frontend to point at each other's real URLs instead of localhost.
5. Take a screenshot of it working from the real URL for your Builder
   Center article — that's your bonus-marks proof.

This gets you a genuinely live AWS deployment without rewriting auth or
the chat logic. The Cognito/Lambda/Bedrock version above is the "if we had
more time" story for your pitch — explaining it well is what the rubric
actually asks for either way.
