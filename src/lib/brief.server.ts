import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const SYSTEM = `You are an AI Executive Assistant specializing in Meeting Notes Summarization, Task Planning & Scheduling, and Professional Email Generation.

Analyze the meeting notes and deliver, in Markdown, exactly these sections:

## Executive Summary
(Brief overview, main objectives, key outcomes)
## Decisions Made
## Action Items
(Markdown table: Task | Owner | Priority | Deadline)
## Deadlines & Milestones
(Markdown table: Date | Deliverable | Responsible Person)
## Daily Schedule
(Markdown table: Time Block | Task | Priority)
## Weekly Schedule
### Monday
### Tuesday
### Wednesday
### Thursday
### Friday
## Professional Follow-Up Email (Formal)
## Professional Follow-Up Email (Friendly)
## Professional Follow-Up Email (Persuasive)

Rules:
- Use only information in the notes. Never invent facts. If information is missing, write "Not Specified".
- Prioritize tasks as High, Medium, or Low.
- Capture all deadlines and dates; identify owners when mentioned.
- Keep it concise, professional, realistic, and ready to send. Each email includes a Subject line.`;

export async function handleBrief(request: Request) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return new Response("AI is not configured.", { status: 500 });
  const { notes } = (await request.json()) as { notes?: string };
  if (!notes || notes.trim().length < 20)
    return new Response("Please paste longer meeting notes.", { status: 400 });

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Meeting notes:\n\n${notes.slice(0, 60000)}` },
    ],
    abortSignal: request.signal,
    maxRetries: 0,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
    onError: ({ error }) => console.error("brief error", error),
  });
  return result.toTextStreamResponse();
}
