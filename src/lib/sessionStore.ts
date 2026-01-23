import { CopilotClient } from "@github/copilot-sdk";

interface SessionStore {
  [key: string]: {
    client: CopilotClient;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  };
}

export const sessionStore: SessionStore = {};

export const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15);
};
