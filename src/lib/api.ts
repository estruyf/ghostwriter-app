interface InterviewData {
  id: string;
  title: string;
  createdAt: number;
  messages: { role: string; content: string }[];
  model: string;
  transcript?: string;
}

interface VoiceProfile {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

interface ElectronAPI {
  listModels: () => Promise<any[]>;
  listInterviews: () => Promise<InterviewData[]>;
  getInterview: (id: string) => Promise<InterviewData | null>;
  deleteInterview: (id: string) => Promise<void>;
  renameInterview: (id: string, title: string) => Promise<InterviewData>;
  updateInterview: (id: string, data: any) => Promise<InterviewData>;
  generateTitle: (id: string) => Promise<string | null>;
  generateTitleFromText: (transcript: string) => Promise<string | null>;
  exportInterview: (id: string) => Promise<boolean>;

  // Voice
  listVoices: () => Promise<VoiceProfile[]>;
  saveVoice: (
    name: string,
    content: string,
    id?: string,
  ) => Promise<VoiceProfile>;
  deleteVoice: (id: string) => Promise<void>;

  startInterview: (data: {
    model: string;
    id?: string;
  }) => Promise<InterviewData>;
  askInterview: (data: {
    message: string;
    model: string;
    id: string;
  }) => Promise<any>;
  generateArticle: (data: any) => Promise<void>;
  onChunk: (callback: (chunk: string) => void) => () => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export async function listVoices() {
  if (window.electron) {
    return window.electron.listVoices();
  }
  throw new Error("Electron API not available");
}

export async function saveVoice(name: string, content: string, id?: string) {
  if (window.electron) {
    return window.electron.saveVoice(name, content, id);
  }
  throw new Error("Electron API not available");
}

export async function deleteVoice(id: string) {
  if (window.electron) {
    return window.electron.deleteVoice(id);
  }
  throw new Error("Electron API not available");
}

export async function listModels() {
  if (window.electron) {
    return window.electron.listModels();
  }
  throw new Error("Electron API not available");
}

export async function listInterviews() {
  if (window.electron) {
    return window.electron.listInterviews();
  }
  throw new Error("Electron API not available");
}

export async function getInterview(id: string) {
  if (window.electron) {
    return window.electron.getInterview(id);
  }
  throw new Error("Electron API not available");
}

export async function deleteInterview(id: string) {
  if (window.electron) {
    return window.electron.deleteInterview(id);
  }
  throw new Error("Electron API not available");
}

export async function renameInterview(id: string, title: string) {
  if (window.electron) {
    return window.electron.renameInterview(id, title);
  }
  throw new Error("Electron API not available");
}

export async function updateInterview(id: string, data: any) {
  if (window.electron) {
    return window.electron.updateInterview(id, data);
  }
  throw new Error("Electron API not available");
}

export async function generateTitle(id: string) {
  if (window.electron) {
    return window.electron.generateTitle(id);
  }
  throw new Error("Electron API not available");
}

export async function generateTitleFromText(transcript: string) {
  if (window.electron) {
    return window.electron.generateTitleFromText(transcript);
  }
  throw new Error("Electron API not available");
}

export async function exportInterview(id: string) {
  if (window.electron) {
    return window.electron.exportInterview(id);
  }
  throw new Error("Electron API not available");
}

export async function startInterview(
  model: string,
  id: string | undefined,
  onChunk: (chunk: string) => void,
) {
  if (window.electron) {
    // Set up listener before making the call
    const cleanup = window.electron.onChunk(onChunk);
    try {
      const result = await window.electron.startInterview({ model, id });
      // Clean up listener after the initial turn is complete.
      // Although startInterview usually sets up the session, if it produces an initial message (like a greeting),
      // we need to capture it. Once the call returns, that turn is over.
      cleanup();
      return result;
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  throw new Error("Electron API not available");
}

export async function askInterview(
  message: string,
  model: string,
  id: string,
  onChunk: (chunk: string) => void,
) {
  if (window.electron) {
    // Set up listener before making the call
    const cleanup = window.electron.onChunk(onChunk);
    try {
      const result = await window.electron.askInterview({ message, model, id });
      // Clean up listener after the turn is complete
      cleanup();
      return result;
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  throw new Error("Electron API not available");
}

export async function generateArticle(
  data: {
    interview?: string;
    interviewId?: string;
    voice?: string;
    voiceId?: string;
    model?: string;
  },
  onChunk: (chunk: string) => void,
) {
  if (window.electron) {
    const cleanup = window.electron.onChunk(onChunk);
    try {
      const result = await window.electron.generateArticle(data);
      cleanup();
      return result;
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  throw new Error("Electron API not available");
}

export function isAuthenticationError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message || error.toString() || "";
  const lowerMessage = errorMessage.toLowerCase();

  // Check for common authentication error patterns
  const authPatterns = [
    "you need to authenticate",
    "authentication required",
    "not authenticated",
    "unauthenticated",
    "unauthorized",
    "invalid token",
    "token expired",
    "github.*auth",
    "copilot.*auth",
    "need.*login",
    "need.*signin",
  ];

  return authPatterns.some((pattern) => new RegExp(pattern).test(lowerMessage));
}
