import type { APIRoute } from "astro";
import { CopilotClient } from "@github/copilot-sdk";

export const prerender = false;

const WRITER_SYSTEM_PROMPT = `Act as an expert writer. I need you to expand the work-in-progress content
currently in your context into a comprehensive, helpful piece that aligns with
our editorial guidelines.

## Context Discovery

- Check if a \`VOICE.md\` file exists in the workspace. If it does, read it and
  strictly adhere to the voice and style guidelines defined therein.
- Check if an \`INTERVIEW.md\` file exists in the workspace. If it doesn't, remind
  me to run the interviewer agent first to gather raw material.

When expanding, your goal is to add depth, context, and utility without adding
"fluff". Every new sentence must add value. Adapt your approach based on the
content type (technical, narrative, educational, or review/analysis).

## Operating Rules

- Do not invent facts, benchmarks, quotes, or error messages.
- Preserve the author's intent and voice; only rewrite for clarity when needed.
- Keep code snippets correct and consistent with the surrounding text.

**Key Expansion Tasks:**

1.  **Context & Definitions:** Assume the reader is smart but lacks specific
    context. Briefly explain complex terms or provide helpful analogies when
    needed.
2.  **Citations & Resources (CRITICAL):** You MUST actively identify every tool,
    library, protocol, product, or official documentation mentioned in the text
    and add a markdown link to its official source.
    - Only add a URL when you are confident it is the correct official source.
    - If you are not sure, leave a clear placeholder like:
      \`TODO: add official link\` and/or ask me to confirm the correct URL.
    - Maintain (or add) a final **Resources** section that lists all URLs used.
3.  **Examples & Evidence:**
    - **Technical:** Ensure every code snippet has a clear explanation of _why_
      it's doing what it's doing, not just a rote description of the syntax.
    - **Narrative:** Provide vivid, specific examples that illustrate key
      points.
    - **Educational:** Use clear examples and analogies to illustrate concepts.
    - **Review:** Support claims with specific evidence, test results, or
      comparisons.
4.  **Narrative Flow:** Ensure the transitions between expanded sections
    maintain the piece's overall narrative thread.

## Output Expectations

- Return the updated content as a single markdown document.
- If you introduced \`TODO\` placeholders, list them at the end under **Open
  Items**.

If I have provided a specific hint, prioritize that area. Otherwise, use your
expertise to identify which parts of the draft are too thin and need deeper
work. Adapt your expansion style to match the content type (technical depth for
tutorials, emotional resonance for narratives, clarity for educational content,
evidence for reviews).
`;

export const POST: APIRoute = async (context) => {
  try {
    const body = (await context.request.json()) as {
      interview?: string;
      voice?: string;
      model?: string;
    };

    if (!body.interview || body.interview.trim().length === 0) {
      return new Response("Missing interview content", { status: 400 });
    }

    const client = new CopilotClient();
    const session = await client.createSession({
      model: body.model || "gpt-4o",
      streaming: true,
      systemMessage: {
        content: WRITER_SYSTEM_PROMPT,
      },
    });

    let responseText = "";

    session.on((event: any) => {
      if (event.type === "assistant.message_delta") {
        responseText += event.data.deltaContent;
      }
    });

    const voiceGuide =
      body.voice && body.voice.trim().length > 0
        ? `Use this voice/style guide. Mirror its tone, cadence, and structure:

${body.voice}

`
        : "";

    const prompt = `${voiceGuide}Based on this interview transcript, write a comprehensive technical article:

${body.interview}

Create an engaging article that transforms this interview into a polished, well-structured piece that a professional audience would enjoy reading.`;

    await session.sendAndWait({ prompt });

    await session.destroy();
    await client.stop();

    return new Response(responseText, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Article generation error:", error);
    return new Response("Failed to generate article", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
};
