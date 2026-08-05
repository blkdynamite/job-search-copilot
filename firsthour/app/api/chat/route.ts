import { anthropic } from "@/lib/anthropic";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { MODELS } from "@/lib/models";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/chat
// Body: { messages: Anthropic.MessageParam[] }  — API-shaped history from the client.
// Streams assistant text back as Server-Sent Events. The Anthropic key stays server-side.
//
// Interim job discovery: the hosted web_search tool is enabled so the agent can hunt in Phase 3,
// exactly as the prototype did. The production shared-index pipeline (SerpAPI/ATS → jobs table)
// will replace this in a later build step; the system prompt's Phase 3 instructions stay the same.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages[] required", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sse = (event: string, data: unknown) =>
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );

      try {
        const anthropicStream = anthropic().messages.stream({
          model: MODELS.sonnet,
          max_tokens: 1500,
          // cache_control on the large static workflow prompt (prompt caching).
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: messages as Parameters<
            ReturnType<typeof anthropic>["messages"]["stream"]
          >[0]["messages"],
          tools: [{ type: "web_search_20250305", name: "web_search" }],
        });

        anthropicStream.on("text", (delta) => sse("delta", { text: delta }));

        const final = await anthropicStream.finalMessage();
        const text = final.content
          .map((b) => (b.type === "text" ? b.text : ""))
          .join("");
        sse("done", { text });
      } catch (err) {
        sse("error", {
          message: err instanceof Error ? err.message : "Something went wrong.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
