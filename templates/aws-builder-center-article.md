# [Team Name] — Club Member Portal

*AWS Student Builder Groups · Campus Hackathon · 70% baseline*

## What we built

One or two sentences: what the app does and who it helps (a new Student
Builder who just joined, asking things like "when is the next workshop?").

## Screenshots

1. Sign up
2. Login
3. Forgot password (reset email or code)
4. Chat with a cited answer
5. Chat fallback (question not in the docs → campus AWS contact)

*(Insert screenshots here — lead with these, before any code.)*

## How it works

- Auth: email + password, JWT sessions, forgot-password via email
  link/code.
- Chat: answers only from the 8-file starter document pack, every reply
  cites the source file and section. When retrieval is weak, the bot
  points to the campus AWS Student Builder contact instead of guessing.

## Deploying this on AWS

| Local prototype piece | AWS service |
| --- | --- |
| Email/password auth | Amazon Cognito user pools |
| Password reset email | Amazon SES |
| Starter document pack | Amazon S3 |
| Document search / RAG | Amazon Bedrock Knowledge Bases |
| Chat + auth API | AWS Lambda behind API Gateway, Cognito authorizer |
| AI answers | Amazon Bedrock (Anthropic Claude models) |

Local demo is what we're submitting. This table is the deployment plan we
would follow to move it to AWS, as required for the pitch.

## Team

Names, roles, and one line each on what you owned.

## Tags

#aws-student-builders-groups #buildonaws #amazon-bedrock #rag
