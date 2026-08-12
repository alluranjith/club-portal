# Getting Started with Amazon Bedrock

## What Bedrock is

Amazon Bedrock gives you API access to foundation models — including
Anthropic's Claude models — without managing any infrastructure. You call
one API and pay per token.

## Enabling model access

In the Bedrock console, go to Model access and request access to the
Anthropic Claude models. Approval is usually instant for Anthropic models
on a personal AWS account.

## Basic call pattern

Bedrock's InvokeModel API takes a model ID, a JSON body with your prompt,
and returns a JSON response. The Bedrock Converse API is the recommended
entry point for new projects since it normalizes the request/response
shape across model providers.

## Using Bedrock for retrieval-augmented answers

For a club-documents chatbot like this portal, the recommended pattern is:

1. Store the starter document pack in S3.
2. Use Bedrock Knowledge Bases to chunk and embed the documents.
3. At query time, Bedrock retrieves the most relevant chunks and passes
   them to the model along with the member's question.
4. The model answers only from the retrieved chunks and returns the source
   chunk metadata so you can cite it.

## Cost awareness

Bedrock is pay-per-token with no committed spend. For a hackathon-scale
prototype, cost is negligible, but always check current pricing on the
AWS pricing page rather than assuming a number.
