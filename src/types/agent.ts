// ── Core Agent Types ──

export type TriggerType = "manual" | "scheduled" | "event";
export type EventTrigger = "email_received" | "slack_message";
export type ScheduleFrequency = "daily" | "weekdays" | "weekly" | "hourly" | "custom_hours";
export type AgentVisibility = "personal" | "published";
export type WorkflowStepType = "fetch" | "ai_process" | "send_output" | "human_review";
export type AcceptedInput = "text" | "documents" | "pdfs" | "images";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  time?: string;         // HH:mm for daily/weekdays/weekly
  dayOfWeek?: string;    // for weekly: "monday", "tuesday", etc.
  intervalHours?: number; // for custom_hours
}

export interface TriggerConfig {
  type: TriggerType;
  schedule?: ScheduleConfig;
  event?: EventTrigger;
}

export interface WorkflowStep {
  id: string;
  order: number;
  type: WorkflowStepType;
  label: string;
  instruction: string;
  mcpConnectionId?: string;
  skillId?: string;
}

export type KnowledgeItemType = "file" | "link";

export interface KnowledgeItem {
  id: string;
  type: KnowledgeItemType;
  name: string;           // display name (file name or user-provided label)
  url: string;            // /api/files/... for uploads, or full URL for links
}

export interface Agent {
  id: string;
  name: string;
  description: string;         // up to 200 words
  systemPrompt: string;        // up to 10000 chars (blank when promptFile is set)
  promptFile?: { name: string; url: string };  // uploaded prompt file
  model: string;
  visibility: AgentVisibility;
  slackHandle: string;
  trigger: TriggerConfig;
  mcpConnectionIds: string[];
  skillIds: string[];
  acceptedInputs: AcceptedInput[];
  isWorkflowAgent: boolean;
  workflowSteps: WorkflowStep[];
  knowledge: KnowledgeItem[];
  favourite: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── External Agent Types ──

export type ExternalAgentPlatform = "copilot" | "atlassian" | "other";

export interface ExternalAgent {
  id: string;
  name: string;
  url: string;
  platform: ExternalAgentPlatform;
  favourite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  mcpConnectionIds: string[];
  scope: "personal" | "team";
  favourite: boolean;
  createdAt: string;
}

export interface McpConnection {
  id: string;
  name: string;
  description: string;
  serverUrl: string;
  status: "approved" | "pending" | "disabled";
  createdAt: string;
}

export interface PendingApproval {
  id: string;
  agentId: string;
  agentName: string;
  workflowStepId: string;
  status: ApprovalStatus;
  createdAt: string;
  reviewedAt?: string;
  summary: string;
  outputPreview: string;
  nextStepDescription: string;
  workflowState: {
    completedSteps: string[];
    remainingSteps: WorkflowStep[];
    accumulatedOutput: string;
  };
}

// ── Model options ──
export const MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { value: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { value: "o3-mini", label: "o3-mini", provider: "openai" },
  { value: "claude-haiku-4-20250414", label: "Claude Haiku", provider: "anthropic" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "anthropic" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4", provider: "anthropic" },
] as const;

export const DEFAULT_MODEL = "gpt-4o-mini";

export const DAYS_OF_WEEK = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

// ── Chat History ──

export interface ChatHistory {
  id: string;
  title: string;             // auto-generated from first user message, truncated ~50 chars
  messages: { role: string; content: string }[];
  createdAt: string;
  updatedAt: string;
}
