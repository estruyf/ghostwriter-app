import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface Interview {
  id: string;
  title: string;
  createdAt: number;
  messages: { role: string; content: string }[];
  model: string;
  transcript?: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

let DATA_DIR = '';
let VOICE_DIR = '';

function initPaths() {
  if (DATA_DIR && VOICE_DIR) return;
  
  DATA_DIR = path.join(app.getPath('userData'), 'interviews');
  VOICE_DIR = path.join(app.getPath('userData'), 'voices');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(VOICE_DIR)) {
    fs.mkdirSync(VOICE_DIR, { recursive: true });
  }
}

export const Store = {
  list: (): Interview[] => {
    initPaths();
    try {
        const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
        return files.map(f => {
            const data = fs.readFileSync(path.join(DATA_DIR, f), 'utf-8');
            return JSON.parse(data);
        }).sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
        console.error("Error listing interviews", e);
        return [];
    }
  },

  get: (id: string): Interview | null => {
    initPaths();
    const filePath = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
  },

  save: (interview: Interview) => {
    initPaths();
    const filePath = path.join(DATA_DIR, `${interview.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(interview, null, 2));
  },

  delete: (id: string) => {
    initPaths();
    const filePath = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  },

  voices: {
    list: (): VoiceProfile[] => {
      initPaths();
      try {
          const files = fs.readdirSync(VOICE_DIR).filter(f => f.endsWith('.json'));
          return files.map(f => {
              const data = fs.readFileSync(path.join(VOICE_DIR, f), 'utf-8');
              return JSON.parse(data);
          }).sort((a, b) => b.createdAt - a.createdAt);
      } catch (e) {
          console.error("Error listing voices", e);
          return [];
      }
    },

    get: (id: string): VoiceProfile | null => {
      initPaths();
      const filePath = path.join(VOICE_DIR, `${id}.json`);
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
      return null;
    },

    save: (voice: VoiceProfile) => {
      initPaths();
      const filePath = path.join(VOICE_DIR, `${voice.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(voice, null, 2));
    },

    delete: (id: string) => {
      initPaths();
      const filePath = path.join(VOICE_DIR, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
};
