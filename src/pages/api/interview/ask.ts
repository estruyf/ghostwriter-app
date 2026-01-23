import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { message: string; model?: string };
    const session = (globalThis as any).interviewSession;

    if (!session) {
      return new Response("Interview session not found", {
        status: 400,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // Store user message
    const messages = (globalThis as any).interviewMessages || [];
    messages.push({ role: "user", content: body.message });
    (globalThis as any).interviewMessages = messages;

    // Get response from Copilot
    let responseText = "";

    session.on((event: any) => {
      if (event.type === "assistant.message_delta") {
        responseText += event.data.deltaContent;
      }
    });

    await session.sendAndWait({ prompt: body.message });

    // Store assistant message
    messages.push({ role: "assistant", content: responseText });

    return new Response(responseText, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Interview ask error:", error);
    return new Response("Failed to get response", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
};
