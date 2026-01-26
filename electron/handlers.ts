import { CopilotClient } from "@github/copilot-sdk";
import { app, dialog, shell, type IpcMain } from "electron";
import { Store, Interview } from "./store.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

import { spawn, type ChildProcess } from "child_process";

type SessionEntry = { session: any; listener?: any; disposable?: any };
const sessions = new Map<string, SessionEntry>();

// Global client instance - reused across all handlers
let globalClient: any = null;
let serverProcess: ChildProcess | null = null;
const COPILOT_PORT = 3710;

const TOKEN_PATH = path.join(app.getPath("userData"), "github-copilot.json");

// Helper to get token
function getToken(): string | null {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
      return data.access_token || null;
    }
  } catch (e) {
    console.error("Error reading token:", e);
  }
  return null;
}

// Client ID for GitHub Copilot
const CLIENT_ID = "Ov23ctDVkRmgkPke0Mmm";

function getCopilotPath() {
  if (app.isPackaged) {
    const unpackedPath = path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "node_modules",
      "@github",
      "copilot",
      "npm-loader.js",
    );
    if (fs.existsSync(unpackedPath)) {
      return unpackedPath;
    }
  }

  const devPath = path.join(
    process.cwd(),
    "node_modules",
    "@github",
    "copilot",
    "npm-loader.js",
  );
  if (fs.existsSync(devPath)) {
    return devPath;
  }

  try {
    const resolved = require.resolve("@github/copilot/npm-loader.js");
    if (app.isPackaged && resolved.includes("app.asar")) {
      return resolved.replace("app.asar", "app.asar.unpacked");
    }
    return resolved;
  } catch (e) {
    console.error("Failed to resolve copilot path", e);
  }

  return devPath;
}

async function startCopilotServer(): Promise<void> {
  if (serverProcess) return;

  const copilotPath = getCopilotPath();
  console.log("Starting Copilot Server at:", copilotPath);

  const token = getToken();
  const env: any = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
  };

  if (token) {
    env.GITHUB_TOKEN = token;
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    try {
      serverProcess = spawn(
        process.execPath,
        [copilotPath, "--server", "--port", COPILOT_PORT.toString()],
        {
          env,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      serverProcess.stdout?.on("data", (data) => {
        const msg = data.toString();
        // Log to parent console
        process.stdout.write(msg);

        // Check for ready signal
        if (msg.includes(`listening on port ${COPILOT_PORT}`)) {
          safeResolve();
        }
      });

      serverProcess.stderr?.on("data", (data) => {
        const msg = data.toString();
        process.stderr.write(msg);
        if (msg.includes("EADDRINUSE")) {
          console.log("Port already in use, assuming external server running.");
          safeResolve();
        }
      });

      serverProcess.on("error", (err) => {
        console.error("Failed to start copilot server:", err);
        serverProcess = null;
        reject(err);
      });

      serverProcess.on("exit", (code) => {
        console.log(`Copilot server exited with code ${code}`);
        // If it exits early (e.g. EADDRINUSE or crash), we let the client try to connect anyway
        // If it was a crash, client connection will fail.
        // If it was EADDRINUSE, client connection might succeed.
        safeResolve();
        serverProcess = null;
      });

      // Fallback timeout
      setTimeout(() => safeResolve(), 5000);
    } catch (e) {
      reject(e);
    }
  });
}

async function getClient() {
  await startCopilotServer();

  // If already initialized and connected, return it
  if (globalClient && globalClient.getState() === "connected") {
    return globalClient;
  }

  // Create client connecting to the local server if null
  if (!globalClient) {
    globalClient = new CopilotClient({
      cliUrl: `localhost:${COPILOT_PORT}`,
      autoStart: true,
      autoRestart: true,
    } as any);
  }

  // Ensure it's connected
  if (
    globalClient.getState() !== "connected" &&
    globalClient.getState() !== "connecting"
  ) {
    try {
      await globalClient.start();
    } catch (e) {
      console.error("Failed to connect to Copilot Server:", e);
      // If connection failed, maybe the server isn't running?
      // But we just called startCopilotServer...
      // If startCopilotServer failed due to EADDRINUSE, it means a server IS running.
      // So failure here might mean the port is blocked or server is zombie.
      throw e;
    }
  }

  return globalClient;
}

const INTERVIEW_SYSTEM_PROMPT = `Act as an expert interviewer. I would like to create content with your support.
Your mission is to interview me to gather material that will be helpful,
relatable, and have a clear narrative thread.

Your process is to have a natural, yet structured, conversation to gather
information. At the end of the interview, you will be asked to provide the full
transcript of the interview, which will be saved to a file named INTERVIEW.md.

## Operating Rules

- Ask **exactly one** question per turn.
- Keep questions short and specific.
- Do not fabricate details, commands, or error messages—ask for the real ones.
- When I share artifacts (code, logs), preserve them verbatim.
- When relevant, explicitly ask for screenshots, graphs, or other visual
  artifacts (attach image files or provide stable URLs). Preserve those
  visuals/URLs verbatim in the transcript and note any captions or context the
  author provides.

## Transcript Output (when asked)

When I ask for the transcript, output a complete markdown transcript suitable to
save as \`INTERVIEW.md\`.

Here are the detailed guidelines you must follow:

## Content Type Adaptation

Before starting the interview, you must determine the content type to adapt your
approach accordingly:

### Content Types:

1. **Technical/Tutorial**: Blog posts about coding, debugging, technical
   implementations
   - Focus: Pain and payoff, technical artifacts (code, errors, logs)
   - Tone: Professional peer, honest about struggles
   - Artifacts: Code snippets, error messages, screenshots, configuration files

2. **General/Narrative**: Personal stories, opinion pieces, thought leadership
   - Focus: Personal journey, insights, reflections
   - Tone: Conversational, authentic, relatable
   - Artifacts: Anecdotes, examples, relevant experiences

3. **Educational/Explainer**: Concept explanations, how-to guides, documentation
   - Focus: Clarity, completeness, logical flow
   - Tone: Clear and accessible, patient teacher
   - Artifacts: Examples, diagrams, step-by-step instructions

4. **Review/Analysis**: Product reviews, comparative analysis, case studies
   - Focus: Evaluation criteria, pros/cons, real-world testing
   - Tone: Balanced, evidence-based, thorough
   - Artifacts: Test results, screenshots, comparisons, metrics

## Core Philosophy (Adapted by Content Type)

- **Narrative Focus:** The goal is to gather raw material for a compelling
  story. For technical content, this could be a debugging mystery or
  implementation journey. For general content, a personal transformation or
  insight discovery. For educational content, a logical progression from simple
  to complex.

- **Authenticity:** Seek genuine experiences, whether that's technical struggles
  and breakthroughs, personal reflections, or honest evaluations. The authentic
  journey contains the most valuable lessons.

- **Rich Artifacts:** Request appropriate materials based on content type:
  - Technical: Code snippets, error logs, terminal output, configuration files
  - General: Specific examples, quotes, memorable moments
  - Educational: Clear examples, visual aids, step-by-step breakdowns
  - Review: Test results, comparisons, screenshots, performance data

## Tone of Voice (Adapt Based on Content Type)

- **Technical/Tutorial:** Professional peer - speak as an experienced developer
  seeking to understand another's work. Honest and direct, avoiding patronizing
  language.

- **General/Narrative:** Warm and empathetic - connect on a human level,
  encourage storytelling, and explore emotional dimensions of experiences.

- **Educational/Explainer:** Patient and supportive - help clarify concepts,
  encourage thorough explanations, and ensure logical flow.

- **Review/Analysis:** Curious and analytical - probe for specifics, ask about
  methodology, and seek balanced perspectives.

## The Interview Process

Your goal is to have a natural, in-depth conversation. Use the
Open-Focused-Closed questioning model.

**1. Starting the Conversation:**

- **FIRST QUESTION (MANDATORY):** Ask me what type of content I want to create.
  Present the four content types (Technical/Tutorial, General/Narrative,
  Educational/Explainer, Review/Analysis) and let me choose or describe my own.

- **SECOND QUESTION:** After understanding the content type, ask for the
  high-level goal of the piece. This will help determine the best narrative
  thread based on the chosen content type.

- **THIRD QUESTION:** Ask how long you expect the final content to be (word
  count, number of sections, etc.). This will help you gauge the depth of detail
  required. Example: if you want a short blog post, you don't need exhaustive
  technical details; if you want a comprehensive tutorial, you will need more
  depth.

**2. Conducting the Interview (Open-Focused-Closed Model):**

- **One Question at a Time:** You must ONLY ask one question per turn. Wait for
  my response.
- **Open:** Start topics broadly, adapted to content type:
  - Technical: "What was the initial problem you were trying to solve?"
  - General: "What inspired you to explore this topic?"
  - Educational: "What's the main concept you want readers to understand?"
  - Review: "What prompted you to evaluate this product/approach?"
- **Focused:** Drill down into details, asking for appropriate artifacts:
  - Technical: "Do you have the exact error message?" or "Can you share the
    code?"
  - General: "Can you give me a specific example of when this happened?"
  - Educational: "Can you break down how that process works step-by-step?"
  - Review: "What specific tests did you run?" or "How did it compare to
    alternatives?"
- **Closed:** Confirm understanding based on context:
  - Technical: "So, the fix was upgrading to v2.1?"
  - General: "So this experience changed how you approach [topic]?"
  - Educational: "So the key principle is [concept]?"
  - Review: "So you found [product] performed better in [scenario]?"

**3. Exploring Topics in Depth:**

- **Ensure you have enough detail to write a full section before moving on.**
- Adapt depth requirements based on content type:
  - Technical: Need complete code examples, full error messages, exact steps
  - General: Need vivid details, emotional context, specific moments
  - Educational: Need clear explanations, prerequisites, common misconceptions
  - Review: Need test methodology, comparison points, quantifiable results

**4. Final Resources Check:**

- Before wrapping up the interview, explicitly ask if there are any specific
  resources, articles, or websites I want to include or reference.
- This ensures the Writer agent has the correct links to include.

**5. Recording the Interview:**

- Do not record the interview during the conversation. You will be asked to
  provide the full transcript at the end.
- The transcript should include a note about the chosen content type at the top.

**6. Ending the Interview:**

- **Important:** I can stop the interview at any time by simply saying "stop" or
  "done" or by indicating the interview is complete.
- When the interview is complete (either you determine sufficient material has
  been gathered OR I explicitly end it), you MUST automatically provide the full
  markdown transcript without waiting for me to ask.
- Format the transcript as follows:
  - Start with a markdown heading for the interview topic
  - Include metadata about content type and date
  - Then a separator
  - Then the full Q&A exchange with clear speaker labels
  - End with any relevant notes or resources mentioned
- After providing the transcript, inform me that it will be saved automatically.

Please start by asking me about the content type I want to create.`;

const WRITER_SYSTEM_PROMPT = `Act as an expert writer. I need you to expand the work-in-progress content
currently in your context into a comprehensive, helpful piece that aligns with
our editorial guidelines.

## Important: Output Format

- You are generating content for a web application that will display the article directly in the UI
- Do NOT mention saving files, file paths, or directories
- Do NOT reference any filesystem locations
- Simply return the markdown content itself
- The application will handle displaying and saving the content

## Context Discovery

- If a voice/style guide has been provided, strictly adhere to those guidelines
- If interview content has been provided, use it as the source material

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

- Return ONLY the article content as markdown
- Do NOT include any meta-commentary about where it's being saved or how to access it
- If you introduced \`TODO\` placeholders, list them at the end under **Open
  Items**

If I have provided a specific hint, prioritize that area. Otherwise, use your
expertise to identify which parts of the draft are too thin and need deeper
work. Adapt your expansion style to match the content type (technical depth for
tutorials, emotional resonance for narratives, clarity for educational content,
evidence for reviews).
`;

export function registerHandlers(ipcMain: IpcMain) {
  ipcMain.handle("interviews:list", async () => {
    return Store.list();
  });

  ipcMain.handle("interviews:get", async (_event, id) => {
    // Only saved interviews can be retrieved
    return Store.get(id);
  });

  ipcMain.handle("interviews:delete", async (_event, id) => {
    Store.delete(id);

    // Clean up session tracking (but don't call destroy/stop on SDK objects)
    const entry = sessions.get(id);
    if (entry) {
      try {
        entry.listener = undefined;
        entry.session = null;
      } catch (e) {
        // Ignore cleanup errors
      }
      sessions.delete(id);
    }
    return true;
  });

  ipcMain.handle("interviews:rename", async (_event, { id, title }) => {
    const interview = Store.get(id);
    if (interview) {
      interview.title = title;
      Store.save(interview);
      return interview;
    }
    throw new Error("Interview not found");
  });

  ipcMain.handle("interviews:update", async (_event, { id, data }) => {
    // Create if missing; this is used when saving a transcript for an unsaved interview
    let interview = Store.get(id);
    if (!interview) {
      interview = {
        id,
        title: data.title || "Untitled",
        createdAt: Date.now(),
        messages: [],
        model: data.model || "gpt-4.1",
        transcript: data.transcript || "",
      };
      Store.save(interview);
      return interview;
    }
    Object.assign(interview, data);
    Store.save(interview);
    return interview;
  });

  ipcMain.handle("interviews:export", async (_event, id) => {
    const interview = Store.get(id);
    if (!interview) throw new Error("Interview not found");

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Export Interview",
      defaultPath: `${interview.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });

    if (canceled || !filePath) return false;

    const content = interview.messages
      .map((m) => `## ${m.role}\n\n${m.content}\n`)
      .join("\n");
    fs.writeFileSync(filePath, content);
    return true;
  });

  // Voice handlers
  ipcMain.handle("voices:list", async () => {
    return Store.voices.list();
  });

  ipcMain.handle("voices:save", async (_event, { name, content, id }) => {
    const voice = {
      id: id || Date.now().toString(36) + Math.random().toString(36).substr(2),
      name,
      content,
      createdAt: Date.now(),
    };
    Store.voices.save(voice);
    return voice;
  });

  ipcMain.handle("voices:delete", async (_event, id) => {
    Store.voices.delete(id);
    return true;
  });

  ipcMain.handle("models:list", async () => {
    try {
      const client = await getClient();

      // Don't create a session or destroy anything - just list models directly
      // The SDK should handle this internally
      const allModels = await client.listModels();

      const enabledModels = allModels.filter(
        (m: any) => m.policy?.state === "enabled",
      );
      const freeModels = enabledModels
        .filter((m: any) => !(m.billing as any)?.is_premium)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      const premiumModels = enabledModels
        .filter((m: any) => (m.billing as any)?.is_premium)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      return [...freeModels, ...premiumModels].map((m: any) => ({
        id: m.id,
        name: m.name,
        isPremium: (m.billing as any)?.is_premium || false,
        multiplier: m.billing?.multiplier || 0,
      }));
    } catch (error) {
      console.error("Failed to list models:", error);
      throw error;
    }
  });

  ipcMain.handle("interview:start", async (event, { model, id }) => {
    try {
      const client = await getClient();
      const session = await client.createSession({
        model: model || "gpt-4.1",
        streaming: false,
        systemMessage: { content: INTERVIEW_SYSTEM_PROMPT },
      });

      let interview: Interview;
      if (id) {
        // Resuming existing interview - Note: Context is lost in this simple implementation
        // ideally we would replay history to the session if the SDK supports it
        const existing = Store.get(id);
        if (existing) {
          interview = existing;
        } else {
          throw new Error(`Interview ${id} not found`);
        }
      } else {
        // New interview session (do not persist yet)
        interview = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          title: "New Interview",
          createdAt: Date.now(),
          messages: [],
          model: model || "gpt-4.1",
        };
        // No Store.save here; persistence happens only when the user saves the transcript.
      }

      // Track session and client together
      const entry = sessions.get(interview.id);
      if (entry && entry.session) {
        // Clean up previous session (but avoid calling destroy as it can cause stream issues)
        try {
          entry.listener = undefined;
          // Don't call await session.destroy() - let SDK handle cleanup
          entry.session = null;
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      // Track session (client is global now)
      sessions.set(interview.id, { session });

      // If it's a new interview, send the initial prompt
      if (!id) {
        try {
          const response = await session.sendAndWait({
            prompt:
              "Start an interview by asking an engaging opening question about what they want to write about.",
          });

          const content =
            response &&
            response.data &&
            typeof response.data === "object" &&
            "content" in response.data
              ? (response.data as any).content
              : "";

          if (content) {
            event.sender.send("stream:chunk", content);
            interview.messages.push({ role: "assistant", content: content });
          }
        } catch (error) {
          throw error;
        }
      }

      return interview;
    } catch (error) {
      console.error("Interview start error:", error);
      throw error;
    }
  });

  ipcMain.handle("interview:ask", async (event, { message, model, id }) => {
    try {
      const entry = sessions.get(id);
      if (!entry) throw new Error("No active session for this interview");
      const session = entry.session;
      let content = "";

      try {
        const response = await session.sendAndWait({ prompt: message });

        content =
          response &&
          typeof response.data === "object" &&
          "content" in response.data
            ? (response.data as any).content
            : "";

        if (content) {
          event.sender.send("stream:chunk", content);
        }
      } catch (error) {
        throw error;
      }

      return { content };
    } catch (error) {
      console.error("Interview ask error:", error);
      throw error;
    }
  });

  ipcMain.handle("interviews:generateTitle", async (event, id) => {
    try {
      const interview = Store.get(id);
      if (!interview) throw new Error("Interview not found");

      const client = await getClient();
      const session = await client.createSession({
        model: interview.model || "gpt-4.1",
        streaming: false,
      });

      const transcript =
        interview.transcript ||
        interview.messages
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n\n");
      const prompt = `Based on the following interview transcript, generate a short, concise title (max 5 words) that captures the main topic. Do not use quotes or prefixes.\n\n${transcript}`;

      const response = await session.sendAndWait({ prompt });
      const content =
        response &&
        response.data &&
        typeof response.data === "object" &&
        "content" in response.data
          ? (response.data as any).content
          : "";
      const title = content.trim().replace(/^["']|["']$/g, "");

      if (title) {
        interview.title = title;
        Store.save(interview);
        // Don't call destroy/stop
        return title;
      }

      // Don't call destroy/stop
      return null;
    } catch (error) {
      console.error("Title generation error:", error);
      return null;
    }
  });

  // Generate a title directly from a transcript string
  ipcMain.handle(
    "interviews:generateTitleFromText",
    async (_event, transcript: string) => {
      try {
        const client = await getClient();
        const session = await client.createSession({
          model: "gpt-4.1",
          streaming: false,
        });

        const prompt = `Based on the following interview transcript, generate a short, concise title (max 5 words) that captures the main topic. Do not use quotes or prefixes.\n\n${transcript}`;
        const response = await session.sendAndWait({ prompt });
        const content =
          response &&
          response.data &&
          typeof response.data === "object" &&
          "content" in response.data
            ? (response.data as any).content
            : "";
        const title = content.trim().replace(/^["']|["']$/g, "");
        // Don't call destroy/stop
        return title || null;
      } catch (error) {
        console.error("Title generation error:", error);
        return null;
      }
    },
  );

  ipcMain.handle("article:generate", async (event, body) => {
    try {
      if (!body.interview && !body.interviewId) {
        throw new Error("Missing interview or interviewId");
      }

      const client = await getClient();
      const session = await client.createSession({
        model: body.model || "gpt-4o",
        streaming: true,
        systemMessage: { content: WRITER_SYSTEM_PROMPT },
        timeout: 300000, // 5 minutes in milliseconds
      });

      const voiceGuide = body.voice
        ? `Use this voice/style guide. Mirror its tone, cadence, and structure:\n\n${body.voice}\n\n`
        : "";

      let finalVoiceGuide = voiceGuide;
      if (body.voiceId) {
        const voiceProfile = Store.voices.get(body.voiceId);
        if (voiceProfile) {
          finalVoiceGuide = `Use this voice/style guide. Mirror its tone, cadence, and structure:\n\n${voiceProfile.content}\n\n`;
        }
      }

      let interviewContent = body.interview;
      // If an ID is passed instead of text, load it
      if (body.interviewId) {
        const interview = Store.get(body.interviewId);
        if (interview) {
          if (interview.transcript) {
            interviewContent = interview.transcript;
          } else {
            interviewContent = interview.messages
              .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
              .join("\n\n");
          }
        }
      }

      if (!interviewContent) {
        throw new Error("Could not find interview content");
      }

      const prompt = `${finalVoiceGuide}Based on this interview transcript, write a comprehensive technical article:\n\n${interviewContent}\n\nCreate an engaging article that transforms this interview into a polished, well-structured piece that a professional audience would enjoy reading.`;

      // Listen for streaming chunks and send to renderer
      let fullContent = "";
      const listener = (sdkEvent: any) => {
        if (!sdkEvent || !sdkEvent.type) return;

        if (sdkEvent.type === "assistant.message_delta") {
          const chunk =
            sdkEvent.data?.deltaContent ||
            sdkEvent.data?.delta ||
            sdkEvent.data?.content ||
            sdkEvent.data?.text ||
            "";

          if (chunk) {
            fullContent += chunk;
            event.sender.send("stream:chunk", chunk);
          }
        }

        if (sdkEvent.type === "assistant.message") {
          const chunk = sdkEvent.data?.content || "";
          if (chunk) {
            fullContent += chunk;
            event.sender.send("stream:chunk", chunk);
          }
        }

        // Optional: detect idle to know completion; content is already accumulated
        // if (sdkEvent.type === "session.idle") { /* no-op */ }
      };

      // The SDK emits typed events via the callback form
      session.on(listener);

      // Send the prompt and wait with 5-minute timeout (300000ms)
      const response = await Promise.race([
        session.sendAndWait({ prompt }),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error("Article generation timed out after 5 minutes")),
            300000,
          ),
        ),
      ]);

      // Cleanup: the SDK's current API doesn't provide an off() that we can rely on, so skip

      // If we got content from the response, use it; otherwise use accumulated content
      const content =
        response &&
        response.data &&
        typeof response.data === "object" &&
        "content" in response.data
          ? (response.data as any).content
          : fullContent;

      // Don't call destroy/stop - let the SDK handle cleanup

      return { content };
    } catch (error) {
      console.error("Article generation error:", error);
      throw error;
    }
  });

  // Copilot Auth Handlers
  ipcMain.handle("copilot:signIn", async () => {
    try {
      const response = await fetch("https://github.com/login/device/code", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          scope: "read:user,read:org,repo,gist",
        }),
      });

      if (!response.ok) throw new Error("Failed to request device code");
      const data: any = await response.json();
      return data;
    } catch (e) {
      console.error("Sign in error:", e);
      throw e;
    }
  });

  ipcMain.handle("copilot:pollToken", async (event, deviceCode) => {
    const start = Date.now();
    const timeout = 15 * 60 * 1000; // 15 mins

    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body: new URLSearchParams({
              client_id: CLIENT_ID,
              device_code: deviceCode,
              grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            }),
          },
        );

        const data: any = await response.json();

        if (data.access_token) {
          // Save token
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(data));

          // Reset global client so it picks up the new token on next use
          if (globalClient) {
            try {
              await globalClient.stop();
            } catch (e) {}
            globalClient = null;
          }
          await getClient(); // Warm up new client

          return { success: true };
        }

        if (data.error === "authorization_pending") {
          // Wait 5s
          await new Promise((r) => setTimeout(r, 5500));
          continue;
        }

        if (data.error === "slow_down") {
          await new Promise((r) => setTimeout(r, 10000));
          continue;
        }

        throw new Error(data.error_description || data.error);
      } catch (e) {
        console.error("Polling error:", e);
        // If fetch failed completely, wait a bit and retry
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    throw new Error("Timeout");
  });

  ipcMain.handle("copilot:init", async () => {
    try {
      await getClient();
      return "ready";
    } catch (e) {
      console.error("Copilot Init Error:", e);
      return "error";
    }
  });

  ipcMain.handle("copilot:checkStatus", async () => {
    try {
      const client = await getClient();
      const status = await client.getAuthStatus();
      return status;
    } catch (e) {
      console.error("Check status error:", e);
      return { status: "NotAuthenticated" };
    }
  });

  ipcMain.handle("copilot:signOut", async () => {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
    if (globalClient) {
      try {
        await globalClient.stop();
      } catch (e) {}
      globalClient = null;
    }

    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }

    return { success: true };
  });

  ipcMain.handle("shell:openExternal", async (_event, url: string) => {
    await shell.openExternal(url);
    return true;
  });

  app.on("before-quit", () => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}
