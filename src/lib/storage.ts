import type { Agent, Skill, McpConnection, PendingApproval, ExternalAgent, ExternalAgentPlatform, ChatHistory } from "../types/agent";

// ── Generic helpers ──

function getItem<T>(key: string, fallback: T[]): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Agents ──

const AGENTS_KEY = "factori_agents";

export function getAgents(): Agent[] {
  return getItem<Agent>(AGENTS_KEY, []);
}

export function getAgent(id: string): Agent | undefined {
  return getAgents().find((a) => a.id === id);
}

export function saveAgent(agent: Agent): void {
  const agents = getAgents();
  const idx = agents.findIndex((a) => a.id === agent.id);
  if (idx >= 0) {
    agents[idx] = agent;
  } else {
    agents.push(agent);
  }
  setItem(AGENTS_KEY, agents);
}

export function deleteAgent(id: string): void {
  setItem(AGENTS_KEY, getAgents().filter((a) => a.id !== id));
}

export function isSlackHandleTaken(handle: string, excludeId?: string): boolean {
  return getAgents().some((a) => a.slackHandle === handle && a.id !== excludeId);
}

// ── External Agents ──

const EXTERNAL_AGENTS_KEY = "factori_external_agents";

export function getExternalAgents(): ExternalAgent[] {
  return getItem<ExternalAgent>(EXTERNAL_AGENTS_KEY, []);
}

export function getExternalAgent(id: string): ExternalAgent | undefined {
  return getExternalAgents().find((a) => a.id === id);
}

export function saveExternalAgent(agent: ExternalAgent): void {
  const agents = getExternalAgents();
  const idx = agents.findIndex((a) => a.id === agent.id);
  if (idx >= 0) {
    agents[idx] = agent;
  } else {
    agents.push(agent);
  }
  setItem(EXTERNAL_AGENTS_KEY, agents);
}

export function deleteExternalAgent(id: string): void {
  setItem(EXTERNAL_AGENTS_KEY, getExternalAgents().filter((a) => a.id !== id));
}

export function detectPlatform(url: string): ExternalAgentPlatform {
  const lower = url.toLowerCase();
  if (lower.includes("microsoft") || lower.includes("copilot") || lower.includes("powerva.ms")) {
    return "copilot";
  }
  if (lower.includes("atlassian") || lower.includes("rovo") || lower.includes("jira") || lower.includes("confluence")) {
    return "atlassian";
  }
  return "other";
}

// ── Skills ──

const SKILLS_KEY = "factori_skills";

export function getSkills(): Skill[] {
  return getItem<Skill>(SKILLS_KEY, []);
}

export function getSkill(id: string): Skill | undefined {
  return getSkills().find((s) => s.id === id);
}

export function saveSkill(skill: Skill): void {
  const skills = getSkills();
  const idx = skills.findIndex((s) => s.id === skill.id);
  if (idx >= 0) {
    skills[idx] = skill;
  } else {
    skills.push(skill);
  }
  setItem(SKILLS_KEY, skills);
}

export function deleteSkill(id: string): void {
  setItem(SKILLS_KEY, getSkills().filter((s) => s.id !== id));
}

// ── MCP Connections ──

const MCP_KEY = "factori_mcp";

// One-time cleanup & seeding on app load
const RETIRED_MCP_IDS = ["atlassian-jira", "microsoft-outlook", "slack"];
const MCP_SEEDS: McpConnection[] = [
  {
    id: "accuweather",
    name: "AccuWeather",
    description: "Real-time weather data via AccuWeather API — provides current conditions for any city worldwide.",
    serverUrl: "http://dataservice.accuweather.com",
    status: "approved",
    createdAt: new Date().toISOString(),
  },
  {
    id: "duckduckgo-search",
    name: "Web Search (DuckDuckGo)",
    description: "Free web search powered by DuckDuckGo — lets agents search the internet for current information, news, and facts.",
    serverUrl: "https://duckduckgo.com",
    status: "approved",
    createdAt: new Date().toISOString(),
  },
];
(function initMcp() {
  // Remove retired connections
  let conns: McpConnection[] = [];
  try {
    conns = JSON.parse(localStorage.getItem(MCP_KEY) || "[]");
    conns = conns.filter((c) => !RETIRED_MCP_IDS.includes(c.id));
  } catch { conns = []; }
  // Seed missing connections
  for (const seed of MCP_SEEDS) {
    if (!conns.find((c) => c.id === seed.id)) {
      conns.push(seed);
    }
  }
  localStorage.setItem(MCP_KEY, JSON.stringify(conns));
})();

// ── Seed default agents on app load ──
const AGENT_SEEDS: Agent[] = [
  {
    id: "seed-tldr",
    name: "TL;DR",
    description: "Summarises key concepts, documents, and web search results into concise TL;DR summaries.",
    systemPrompt: `You are an AI agent designed to summarize key concepts and documents. Your task is to take user prompts, identify the relevant information, and create concise TL;DR summaries. Here are your guidelines:

1. **User Prompt Processing:** When a user submits a prompt, evaluate its content. If necessary, conduct a web search to gather additional information related to the subject.

2. **Document Handling:** If the user provides any attachments, analyze the content of these documents to extract essential points.

3. **Summary Creation:** Generate a TL;DR that is clear and concise, with a maximum length of 500 words unless the user specifies a different limit. Aim to summarize the most important information effectively.

4. **Source Referencing:** When you summarize information obtained from web searches, include concise references to the sources used. Ensure that the references are clear and appropriately formatted.

Keep in mind the goal is to help the user quickly understand the key concepts without overwhelming them with excessive detail. Always strive for clarity and brevity.`,
    model: "gpt-4o-mini",
    visibility: "published",
    slackHandle: "tldr",
    trigger: { type: "manual" },
    mcpConnectionIds: ["duckduckgo-search"],
    skillIds: [],
    acceptedInputs: ["text", "documents", "pdfs"],
    isWorkflowAgent: false,
    workflowSteps: [],
    knowledge: [],
    favourite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
(function initAgents() {
  let agents: Agent[] = [];
  try { agents = JSON.parse(localStorage.getItem(AGENTS_KEY) || "[]"); } catch { agents = []; }
  for (const seed of AGENT_SEEDS) {
    if (!agents.find((a) => a.id === seed.id)) agents.push(seed);
  }
  localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
})();

// ── Seed default skills on app load ──
const SKILL_SEEDS: Skill[] = [
  {
    id: "seed-weekly-ai-news",
    name: "Weekly AI News",
    description: "Searches the web for the latest AI news and produces a structured weekly bulletin with TL;DRs and source links.",
    instructions: `1. Start by noting today's date to ensure the news is from the previous week.
2. Conduct a web search for news articles related to artificial intelligence from the last week.
3. Focus your search on major technology news outlets and reputable blog posts from key AI organizations, including OpenAI, Anthropic, Meta, DeepMind, and Mistral.
4. Gather articles covering all types of news related to AI, including technical advancements, financial developments, and industry trends.
5. For each relevant article you find:
   - Write a TL;DR explaining the key headlines, like a bulletin.
   - Include a brief summary that captures the main points.
   - Include a clickable link to the full article for users to follow up and read more.
6. Compile all the summaries and links into a clear and organized format, ready to be shared with the user.`,
    mcpConnectionIds: ["duckduckgo-search"],
    scope: "team",
    favourite: false,
    createdAt: new Date().toISOString(),
  },
];
(function initSkills() {
  let skills: Skill[] = [];
  try { skills = JSON.parse(localStorage.getItem(SKILLS_KEY) || "[]"); } catch { skills = []; }
  for (const seed of SKILL_SEEDS) {
    if (!skills.find((s) => s.id === seed.id)) skills.push(seed);
  }
  localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
})();

export function getMcpConnections(): McpConnection[] {
  return getItem<McpConnection>(MCP_KEY, []);
}

export function saveMcpConnection(conn: McpConnection): void {
  const conns = getMcpConnections();
  const idx = conns.findIndex((c) => c.id === conn.id);
  if (idx >= 0) {
    conns[idx] = conn;
  } else {
    conns.push(conn);
  }
  setItem(MCP_KEY, conns);
}

// ── Pending Approvals ──

const APPROVALS_KEY = "pendingApprovals";

export function getApprovals(): PendingApproval[] {
  return getItem<PendingApproval>(APPROVALS_KEY, []);
}

export function saveApproval(approval: PendingApproval): void {
  const approvals = getApprovals();
  const idx = approvals.findIndex((a) => a.id === approval.id);
  if (idx >= 0) {
    approvals[idx] = approval;
  } else {
    approvals.push(approval);
  }
  setItem(APPROVALS_KEY, approvals);
}

export function updateApprovalStatus(id: string, status: PendingApproval["status"]): void {
  const approvals = getApprovals();
  const approval = approvals.find((a) => a.id === id);
  if (approval) {
    approval.status = status;
    approval.reviewedAt = new Date().toISOString();
    setItem(APPROVALS_KEY, approvals);
  }
}

// ── ID generation ──

export function generateId(): string {
  return crypto.randomUUID();
}

// ── User name ──

const USER_NAME_KEY = "factori_user_name";

export function getUserName(): string {
  return localStorage.getItem(USER_NAME_KEY) || "";
}

export function setUserName(name: string): void {
  localStorage.setItem(USER_NAME_KEY, name);
}

// ── Chat History ──

const CHAT_HISTORY_KEY = "factori_chat_history";
const MAX_CHATS = 5;

export function getChatHistories(): ChatHistory[] {
  return getItem<ChatHistory>(CHAT_HISTORY_KEY, [])
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getChatHistory(id: string): ChatHistory | undefined {
  return getChatHistories().find((c) => c.id === id);
}

export function saveChatHistory(chat: ChatHistory): void {
  let chats = getItem<ChatHistory>(CHAT_HISTORY_KEY, []);
  const idx = chats.findIndex((c) => c.id === chat.id);
  if (idx >= 0) {
    chats[idx] = chat;
  } else {
    chats.push(chat);
  }
  // Sort by updatedAt desc, keep only the newest MAX_CHATS
  chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  chats = chats.slice(0, MAX_CHATS);
  setItem(CHAT_HISTORY_KEY, chats);
}

export function deleteChatHistory(id: string): void {
  setItem(CHAT_HISTORY_KEY, getItem<ChatHistory>(CHAT_HISTORY_KEY, []).filter((c) => c.id !== id));
}

// ── Slug generation for Slack handles ──

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateSlackHandle(
  agentName: string,
  visibility: "personal" | "published" = "personal",
  userName?: string,
): string {
  const agentSlug = slugify(agentName) || "agent";
  const userSlug = userName ? slugify(userName) : "";
  const base =
    visibility === "personal" && userSlug
      ? `${userSlug}-${agentSlug}`
      : agentSlug;
  let handle = base;
  let counter = 1;
  while (isSlackHandleTaken(handle)) {
    handle = `${base}-${counter}`;
    counter++;
  }
  return handle;
}

