# Ghostwriter App

A test project demonstrating the new
[GitHub Copilot SDK](https://github.com/github/copilot-sdk) for building
AI-powered content creation tools.

## What is Ghostwriter?

Ghostwriter is an AI-assisted content creation application that helps you
transform ideas into polished written content through a two-step process:

1. **Interview Mode**: An AI interviewer asks you targeted questions to gather
   raw material for your content. The conversation adapts to your chosen content
   type (Technical/Tutorial, General/Narrative, Educational/Explainer, or
   Review/Analysis).

2. **Article Writer**: Takes your interview transcript and transforms it into a
   polished, well-structured article. You can optionally provide a voice/style
   guide to ensure the output matches your desired tone and format.

## Features

- **Multi-Turn AI Conversations**: Persistent interview sessions that maintain
  context across page refreshes
- **Multiple AI Models**: Choose from various OpenAI, Anthropic Claude, and
  Google Gemini models (free and premium options)
- **Voice Guide Support**: Upload custom style guidelines to maintain consistent
  tone and formatting
- **Real-time Streaming**: See responses appear as the AI generates them
- **Session Persistence**: Your work is automatically saved to localStorage
- **Modern UI**: Built with Tailwind CSS 4 and Astro 5

## How to Use

### Prerequisites

- Node.js 18 or higher
- GitHub Copilot CLI installed and authenticated
- A GitHub Copilot subscription
- GitHub Copilot access configured in your environment

### Installation

```sh
npm install
```

### Running the App

```sh
npm run dev
```

The app will start at `http://localhost:4321`

### Workflow

1. **Choose Your Mode**:
   - **Get Interviewed**: Start an AI-driven interview to gather content
     material
   - **Write Article**: Convert an existing interview transcript into a polished
     article

2. **Interview Mode**:
   - Select your preferred AI model from the dropdown
   - Answer the interviewer's questions about your content
   - Press Enter to send responses (Shift+Enter for new lines)
   - Type "stop" or "done" to end the interview
   - Click "Generate Transcript" to save your interview

3. **Article Writer Mode**:
   - Upload your interview transcript (markdown file)
   - Optionally upload a voice/style guide
   - Select your preferred AI model
   - Click "Generate Article" to create your polished content
   - Download or copy the final article

### Model Selection

The app dynamically fetches available AI models from GitHub Copilot. Models are
organized into:

- **Free Models**: GPT-4.1, GPT-5 mini (included with your subscription)
- **Premium Models**: Claude Sonnet 4.5, GPT-5, Gemini 3 Pro, and others (may
  have usage multipliers)

## Tech Stack

- **Framework**: [Astro 5](https://astro.build/) with React 18
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **AI SDK**: [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- **Markdown**: [Streamdown](https://streamdown.ai/) for rendering
- **State Management**: React hooks + localStorage

## Project Structure

```text
/
├── public/
├── src/
│   ├── components/
│   │   ├── App.tsx              # Main application state
│   │   ├── Home.tsx             # Landing page
│   │   ├── Interview.tsx        # Interview mode UI
│   │   ├── ArticleWriter.tsx    # Article generation UI
│   │   └── Results.tsx          # Display final output
│   ├── pages/
│   │   ├── index.astro          # Entry point
│   │   └── api/
│   │       ├── models/list.ts   # Fetch available AI models
│   │       ├── interview/
│   │       │   ├── start.ts     # Initialize interview session
│   │       │   └── ask.ts       # Continue interview
│   │       └── article/
│   │           └── generate.ts  # Generate article from interview
│   └── styles/
│       └── tailwind.css         # Global styles
└── package.json
```

## About This Project

This is an experimental test project built to explore the capabilities of the
new GitHub Copilot SDK. It demonstrates:

- Server-side AI model integration with streaming responses
- Multi-turn conversation management
- Dynamic model selection
- Session persistence across page refreshes
- Integration with multiple AI model families (OpenAI, Anthropic, Google)

The project is based on the
[Ghostwriter Agents](https://github.com/estruyf/ghostwriter-agents-ai) concept,
adapted to use the GitHub Copilot SDK instead of direct API integrations.

## Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |

## Learn More

- [GitHub Copilot SDK Documentation](https://github.com/github/copilot-sdk)
- [Ghostwriter Agents Project](https://github.com/estruyf/ghostwriter-agents-ai)
- [Astro Documentation](https://docs.astro.build)

