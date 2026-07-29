import Anthropic from "@anthropic-ai/sdk";

// Server-only Anthropic client. The API key never reaches the browser — every model call
// goes through a route handler, unlike the prototype which called the API directly from the client.
let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}
