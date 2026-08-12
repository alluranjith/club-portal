# Serverless API Notes: AWS Lambda

## When Lambda fits a club project

Lambda is a good fit for small, bursty APIs like this club portal's chat
endpoint — you're not paying for idle time between member questions, and it
scales automatically during hackathon-day traffic spikes.

## Typical pattern for this kind of app

API Gateway receives the HTTP request, invokes a Lambda function per route,
and the function reads from S3 or DynamoDB before returning JSON. Cognito
can sit in front of API Gateway as an authorizer so only logged-in members
reach the chat function.

## Cold starts

Node.js Lambda functions typically cold-start in well under a second for
small bundles. Keep dependencies minimal and avoid bundling unused packages
to keep cold starts short.

## Local-to-Lambda migration notes

An Express app's route handlers can usually be adapted to individual Lambda
handlers with light changes — the main differences are how you read the
request body and how you return a response object instead of calling
`res.send`.

## Environment and secrets

Store API keys and JWT secrets in AWS Secrets Manager or Lambda environment
variables, never in the deployed code bundle.
