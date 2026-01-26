import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("electron", {
  listModels: () => ipcRenderer.invoke("models:list"),
  listInterviews: () => ipcRenderer.invoke("interviews:list"),
  getInterview: (id: string) => ipcRenderer.invoke("interviews:get", id),
  deleteInterview: (id: string) => ipcRenderer.invoke("interviews:delete", id),
  renameInterview: (id: string, title: string) =>
    ipcRenderer.invoke("interviews:rename", { id, title }),
  updateInterview: (id: string, data: any) =>
    ipcRenderer.invoke("interviews:update", { id, data }),
  generateTitle: (id: string) =>
    ipcRenderer.invoke("interviews:generateTitle", id),
  generateTitleFromText: (transcript: string) =>
    ipcRenderer.invoke("interviews:generateTitleFromText", transcript),
  exportInterview: (id: string) => ipcRenderer.invoke("interviews:export", id),

  // Voice
  listVoices: () => ipcRenderer.invoke("voices:list"),
  saveVoice: (name: string, content: string, id?: string) =>
    ipcRenderer.invoke("voices:save", { name, content, id }),
  deleteVoice: (id: string) => ipcRenderer.invoke("voices:delete", id),

  startInterview: (data: { model: string; id?: string }) =>
    ipcRenderer.invoke("interview:start", data),
  askInterview: (data: { message: string; model: string; id: string }) =>
    ipcRenderer.invoke("interview:ask", data),
  generateArticle: (data: {
    interview?: string;
    interviewId?: string;
    voice?: string;
    voiceId?: string;
    model?: string;
  }) => ipcRenderer.invoke("article:generate", data),
  onChunk: (callback: (chunk: string) => void) => {
    const subscription = (_event: IpcRendererEvent, chunk: string) =>
      callback(chunk);
    ipcRenderer.on("stream:chunk", subscription);
    return () => ipcRenderer.removeListener("stream:chunk", subscription);
  },

  // Copilot Auth
  initCopilot: () => ipcRenderer.invoke("copilot:init"),
  signIn: () => ipcRenderer.invoke("copilot:signIn"),
  pollToken: (deviceCode: string) =>
    ipcRenderer.invoke("copilot:pollToken", deviceCode),
  checkStatus: () => ipcRenderer.invoke("copilot:checkStatus"),
  signOut: () => ipcRenderer.invoke("copilot:signOut"),

  // External links
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
});
