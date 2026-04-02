# Factori — AI Agent Portal

Factori is a proof-of-concept AI agent portal built with React, TypeScript, and Tailwind CSS. It lets you create, configure, and chat with AI agents powered by OpenAI and Anthropic models, with a modular skill and tool-connection ecosystem.

## Features

### 💬 Chat Interface
- Real-time streaming chat with **OpenAI** (GPT-4o, GPT-4o Mini) and **Anthropic** (Claude Sonnet, Claude Haiku) models
- **Markdown rendering** in assistant responses (tables, code blocks, lists, headings) via `react-markdown` + `remark-gfm`
- Per-message agent, model, and skill selection
- **File attachments** — upload `.docx`, `.pdf`, `.txt`, `.md`, and image files directly in chat
  - Documents are extracted server-side using `mammoth` (Word) and `pdf-parse` (PDF)
  - File content is injected into the LLM context automatically
- Chat history with save/load/delete (stored in `localStorage`, last 5 chats)

### 🤖 Agent Builder
- Full agent creation form with name, description, system prompt, model selection, and visibility (personal/team)
- **AI Prompt Wizard** — a chat-based modal that helps generate and refine system prompts using AI
- Upload prompt files or attach reference documents
- **Knowledge Base** — attach files or external URLs as reference material for the agent
- **Accepted Inputs** — configure which file types each agent can receive (text, documents, PDFs, images)
- **Trigger Configuration** — set agents to run on-demand, on a schedule, or via event triggers
- **Workflow Builder** — create multi-step workflow agents with a visual step editor
- Slack handle generation for agent integration
- Edit existing agents via `/create-agent/:id`

### ⚡ Skill Builder
- Create reusable instruction sets that any agent can use
- **AI Skill Wizard** — guided AI assistant to help write skill instructions
- Skills can declare required MCP connections
- Personal or team scope
- Skill library with favourites, search, and edit support

### 🔌 MCP Connections
- Model Context Protocol (MCP) connection management
- **AccuWeather integration** — tool-calling pattern where the LLM can autonomously fetch live weather data
- Agents and skills can declare which MCP connections they need
- Connection approval workflow (approved/pending/disabled statuses)

### 📋 Approvals
- Pending approval queue for MCP connections and other governance items

### 🔧 Dev Mode
- Toggle developer mode to see additional debugging information

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, React Router v7 |
| Backend | Express 5, Node.js |
| LLM Providers | OpenAI SDK, Anthropic SDK |
| File Processing | Multer (uploads), Mammoth (.docx), pdf-parse (.pdf) |
| Markdown | react-markdown, remark-gfm, @tailwindcss/typography |
| Build Tool | Vite 8 |
| Storage | localStorage (metadata), `./uploads/` (files) |

## Project Structure

```
├── server.ts                  # Express backend — LLM chat, file uploads, weather API
├── src/
│   ├── App.tsx                # Route definitions
│   ├── index.css              # Tailwind + custom styles
│   ├── main.tsx               # React entry point
│   ├── components/
│   │   ├── Layout.tsx         # App shell with sidebar
│   │   ├── Sidebar.tsx        # Navigation + chat history
│   │   ├── PromptWizardModal.tsx   # AI prompt generation wizard
│   │   ├── SkillWizardModal.tsx    # AI skill instruction wizard
│   │   ├── WorkflowBuilder.tsx     # Multi-step workflow editor
│   │   ├── AddExternalAgentModal.tsx
│   │   ├── DevModeToggle.tsx
│   │   └── PageShell.tsx
│   ├── pages/
│   │   ├── ChatPage.tsx       # Main chat interface
│   │   ├── CreateAgentPage.tsx
│   │   ├── AgentLibraryPage.tsx
│   │   ├── CreateSkillPage.tsx
│   │   ├── SkillLibraryPage.tsx
│   │   ├── McpConnectionsPage.tsx
│   │   └── ApprovalsPage.tsx
│   ├── lib/
│   │   └── storage.ts         # localStorage CRUD helpers
│   └── types/
│       └── agent.ts           # TypeScript interfaces (Agent, Skill, McpConnection, etc.)
├── vite.config.ts
├── package.json
└── .env.local                 # API keys (not committed)
```

## Getting Started

### Prerequisites

- Node.js ≥ 20
- OpenAI API key
- Anthropic API key
- AccuWeather API key (optional, for weather tool)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local`** in the project root:
   ```env
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   ACCUWEATHER_API_KEY=...        # optional
   ```

3. **Start the backend:**
   ```bash
   npx tsx server.ts
   ```

4. **Start the frontend dev server** (in a separate terminal):
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173)

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run dev:server` | Start backend with hot-reload via tsx watch |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Stream chat completion (SSE) with tool calling |
| `POST` | `/api/upload` | Upload a file (max 10 MB) |
| `GET` | `/api/files/:filename` | Serve an uploaded file |
| `DELETE` | `/api/files/:filename` | Delete an uploaded file |
| `GET` | `/api/weather/search?q=` | Search AccuWeather locations |
| `GET` | `/api/weather/current/:locationKey` | Get current conditions |

## License

Proof of concept — internal use only.

