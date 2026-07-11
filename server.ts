import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import path from "path";
import fs from "fs";
import mammoth from "mammoth";
import { search as ddgSearch, SafeSearchType } from "duck-duck-scrape";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// Load .env.local
dotenv.config({ path: ".env.local" });

const app = express();
app.use(cors());
app.use(express.json());

// ── File uploads ──
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e6);
      cb(null, `${uniquePrefix}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".md", ".txt", ".docx", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .md, .txt, .docx, .pdf, and image files are allowed"));
    }
  },
});

// Upload a prompt file
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  res.json({
    name: req.file.originalname,
    url: `/api/files/${req.file.filename}`,
    storedName: req.file.filename,
  });
});

// Serve uploaded files (add ?extract=true to get plain text content)
app.get("/api/files/:filename", async (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  if (req.query.extract === "true") {
    try {
      const text = await extractFileContent(filePath);
      res.type("text/plain").send(text);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to extract content: " + (err?.message || "Unknown") });
    }
    return;
  }
  res.sendFile(filePath);
});

// Delete an uploaded file
app.delete("/api/files/:filename", (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  res.json({ ok: true });
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface KnowledgeItem {
  id: string;
  type: "file" | "link";
  name: string;
  url: string;
}

interface ChatAttachment {
  name: string;
  url: string; // e.g. /api/files/12345-doc.docx
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  knowledge?: KnowledgeItem[];
  mcpConnectionIds?: string[];
  skillInstructions?: string;
  attachments?: ChatAttachment[];
}

function isAnthropicModel(model: string) {
  return model.startsWith("claude");
}

// ── File content extraction helper ──
async function extractFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else if (ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  } else {
    // .txt, .md, .csv, etc. — read as plain text
    return fs.readFileSync(filePath, "utf-8");
  }
}

// ── Knowledge content resolver ──
async function resolveKnowledgeContent(items: KnowledgeItem[]): Promise<string> {
  const chunks: string[] = [];
  for (const item of items) {
    try {
      if (item.type === "file") {
        // Local uploaded file — extract stored filename from URL like /api/files/12345-doc.md
        const storedName = item.url.split("/").pop();
        if (!storedName) continue;
        const filePath = path.join(UPLOADS_DIR, storedName);
        if (fs.existsSync(filePath)) {
          const content = await extractFileContent(filePath);
          const trimmed = content.length > 50000 ? content.slice(0, 50000) + "\n[...truncated]" : content;
          chunks.push(`--- Knowledge: ${item.name} ---\n${trimmed}`);
        }
      } else if (item.type === "link") {
        // Fetch external URL content
        const response = await fetch(item.url, {
          headers: { "Accept": "text/plain, text/html, text/markdown, */*" },
          signal: AbortSignal.timeout(10000), // 10s timeout
        });
        if (response.ok) {
          const text = await response.text();
          // Limit to ~50k chars to avoid blowing up context
          const trimmed = text.length > 50000 ? text.slice(0, 50000) + "\n[...truncated]" : text;
          chunks.push(`--- Knowledge: ${item.name} (${item.url}) ---\n${trimmed}`);
        }
      }
    } catch (err: any) {
      console.warn(`Failed to resolve knowledge item "${item.name}":`, err?.message);
      chunks.push(`--- Knowledge: ${item.name} ---\n[Error: could not load content]`);
    }
  }
  return chunks.join("\n\n");
}

// ── Tool definitions for MCP-backed integrations ──

const WEATHER_TOOL_OPENAI: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get the current weather conditions for a city. Use this whenever the user asks about weather, temperature, or climate conditions in a specific location.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "The city name to look up weather for, e.g. 'London', 'New York', 'Tokyo'",
        },
      },
      required: ["city"],
    },
  },
};

const WEATHER_TOOL_ANTHROPIC = {
  name: "get_weather",
  description: "Get the current weather conditions for a city. Use this whenever the user asks about weather, temperature, or climate conditions in a specific location.",
  input_schema: {
    type: "object" as const,
    properties: {
      city: {
        type: "string",
        description: "The city name to look up weather for, e.g. 'London', 'New York', 'Tokyo'",
      },
    },
    required: ["city"],
  },
};

// ── Web Search tool definitions ──

const WEB_SEARCH_TOOL_OPENAI: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "web_search",
    description: "Search the web for current information. Use this when the user asks about recent events, facts you're unsure about, or anything that would benefit from up-to-date web results.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query, e.g. 'latest Node.js version', 'Premier League scores today'",
        },
      },
      required: ["query"],
    },
  },
};

const WEB_SEARCH_TOOL_ANTHROPIC = {
  name: "web_search",
  description: "Search the web for current information. Use this when the user asks about recent events, facts you're unsure about, or anything that would benefit from up-to-date web results.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "The search query, e.g. 'latest Node.js version', 'Premier League scores today'",
      },
    },
    required: ["query"],
  },
};

/** Execute a web search via DuckDuckGo and return formatted results */
async function executeWebSearch(query: string): Promise<string> {
  try {
    const results = await ddgSearch(query, { safeSearch: SafeSearchType.MODERATE });
    if (!results.results || results.results.length === 0) {
      return `No search results found for "${query}".`;
    }
    // Return top 5 results formatted
    const top = results.results.slice(0, 5);
    const formatted = top.map((r, i) =>
      `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description || "No description"}`
    ).join("\n\n");
    return `Web search results for "${query}":\n\n${formatted}`;
  } catch (err: any) {
    console.warn("Web search failed:", err?.message);
    return `Web search failed: ${err?.message || "Unknown error"}`;
  }
}

/** Execute a tool call by name and return the result string */
async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  if (name === "get_weather") {
    const city = args.city;
    if (!city) return "Error: city parameter is required";
    const result = await resolveWeatherForCity(city);
    return result || `Could not retrieve weather data for "${city}". The city may not exist or the weather service may be unavailable.`;
  }
  if (name === "web_search") {
    const query = args.query;
    if (!query) return "Error: query parameter is required";
    return await executeWebSearch(query);
  }
  return `Unknown tool: ${name}`;
}

app.post("/api/chat", async (req, res) => {
  const { model, messages, systemPrompt, knowledge, mcpConnectionIds, skillInstructions, attachments } = req.body as ChatRequest;

  if (!messages || !model) {
    res.status(400).json({ error: "model and messages are required" });
    return;
  }

  // Resolve knowledge content and append to system prompt
  let finalSystemPrompt = systemPrompt || "You are a helpful AI assistant.";

  // Append skill instructions if a specific skill is selected
  if (skillInstructions) {
    finalSystemPrompt += "\n\n# Active Skill Instructions\nFollow these additional instructions for this conversation:\n\n" + skillInstructions;
  }
  if (knowledge && knowledge.length > 0) {
    const knowledgeContent = await resolveKnowledgeContent(knowledge);
    if (knowledgeContent) {
      finalSystemPrompt += "\n\n# Reference Knowledge\nThe following documents/links have been provided as reference material. Use them when relevant to the user's questions.\n\n" + knowledgeContent;
    }
  }

  // Resolve attachment file content and inject into the last user message
  if (attachments && attachments.length > 0) {
    const attachmentChunks: string[] = [];
    for (const att of attachments) {
      try {
        const storedName = att.url.split("/").pop();
        if (!storedName) continue;
        const filePath = path.join(UPLOADS_DIR, storedName);
        if (fs.existsSync(filePath)) {
          const content = await extractFileContent(filePath);
          const trimmed = content.length > 50000 ? content.slice(0, 50000) + "\n[...truncated]" : content;
          attachmentChunks.push(`--- Attached File: ${att.name} ---\n${trimmed}`);
        }
      } catch (err: any) {
        console.warn(`Failed to read attachment "${att.name}":`, err?.message);
        attachmentChunks.push(`--- Attached File: ${att.name} ---\n[Error: could not read file]`);
      }
    }
    if (attachmentChunks.length > 0) {
      // Find the last user message and append the file content to it
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          messages[i] = {
            ...messages[i],
            content: messages[i].content + "\n\n" + attachmentChunks.join("\n\n"),
          };
          break;
        }
      }
    }
  }

  // Determine which tools are available based on linked MCP connections
  const hasWeather = mcpConnectionIds && mcpConnectionIds.includes("accuweather");
  const hasWebSearch = mcpConnectionIds && mcpConnectionIds.includes("duckduckgo-search");

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    if (isAnthropicModel(model)) {
      await handleAnthropicChat(model, messages, finalSystemPrompt, hasWeather || false, hasWebSearch || false, res);
    } else {
      await handleOpenAIChat(model, messages, finalSystemPrompt, hasWeather || false, hasWebSearch || false, res);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("LLM error:", err?.message || err);
    res.write(`data: ${JSON.stringify({ error: err?.message || "Unknown error" })}\n\n`);
    res.end();
  }
});

// ── OpenAI chat with tool calling ──
async function handleOpenAIChat(
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
  hasWeather: boolean,
  hasWebSearch: boolean,
  res: express.Response,
) {
  const oaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const toolsList: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
  if (hasWeather) toolsList.push(WEATHER_TOOL_OPENAI);
  if (hasWebSearch) toolsList.push(WEB_SEARCH_TOOL_OPENAI);
  const tools = toolsList.length > 0 ? toolsList : undefined;

  // First call — may return tool calls or a direct response
  const firstResponse = await openai.chat.completions.create({
    model,
    messages: oaiMessages,
    tools,
    stream: false, // non-streaming first to detect tool calls
  });

  const choice = firstResponse.choices[0];

  if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
    // LLM wants to call tools — execute them
    oaiMessages.push(choice.message);

    for (const toolCall of choice.message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`🔧 Tool call: ${toolCall.function.name}(${JSON.stringify(args)})`);
      const result = await executeTool(toolCall.function.name, args);
      console.log(`📡 Tool result: ${result.slice(0, 200)}`);
      oaiMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }

    // Second call — stream the final response with tool results
    const stream = await openai.chat.completions.create({
      model,
      messages: oaiMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }
  } else {
    // No tool calls — stream the response directly
    // Since we already have the non-streaming response, send it as tokens
    const content = choice.message.content || "";
    if (content) {
      res.write(`data: ${JSON.stringify({ token: content })}\n\n`);
    }
  }
}

// ── Anthropic chat with tool calling ──
async function handleAnthropicChat(
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
  hasWeather: boolean,
  hasWebSearch: boolean,
  res: express.Response,
) {
  const userMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const toolsList: any[] = [];
  if (hasWeather) toolsList.push(WEATHER_TOOL_ANTHROPIC);
  if (hasWebSearch) toolsList.push(WEB_SEARCH_TOOL_ANTHROPIC);
  const tools = toolsList.length > 0 ? toolsList : undefined;

  // First call — may return tool use blocks
  const firstResponse = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: userMessages,
    tools,
  });

  // Check if the response contains tool use
  const toolUseBlocks = firstResponse.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

  if (toolUseBlocks.length > 0 && firstResponse.stop_reason === "tool_use") {
    // Send any text before the tool call
    for (const block of firstResponse.content) {
      if (block.type === "text" && block.text) {
        res.write(`data: ${JSON.stringify({ token: block.text })}\n\n`);
      }
    }

    // Execute tool calls and build result messages
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      console.log(`🔧 Tool call: ${toolUse.name}(${JSON.stringify(toolUse.input)})`);
      const result = await executeTool(toolUse.name, toolUse.input as Record<string, any>);
      console.log(`📡 Tool result: ${result.slice(0, 200)}`);
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    // Second call — stream the final response
    const secondMessages = [
      ...userMessages,
      { role: "assistant" as const, content: firstResponse.content },
      { role: "user" as const, content: toolResults },
    ];

    const stream = anthropic.messages.stream({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: secondMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ token: event.delta.text })}\n\n`);
      }
    }
  } else {
    // No tool calls — send the response directly
    for (const block of firstResponse.content) {
      if (block.type === "text" && block.text) {
        res.write(`data: ${JSON.stringify({ token: block.text })}\n\n`);
      }
    }
  }
}

// ── AccuWeather "MCP" (direct API integration) ──

const ACCUWEATHER_BASE = "http://dataservice.accuweather.com";

app.get("/api/weather/search", async (req, res) => {
  const q = req.query.q as string;
  const apiKey = process.env.ACCUWEATHER_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "ACCUWEATHER_API_KEY not configured" }); return; }
  if (!q) { res.status(400).json({ error: "q query parameter is required" }); return; }
  try {
    const r = await fetch(`${ACCUWEATHER_BASE}/locations/v1/cities/search?apikey=${apiKey}&q=${encodeURIComponent(q)}`);
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: err?.message || "AccuWeather location search failed" });
  }
});

app.get("/api/weather/current/:locationKey", async (req, res) => {
  const apiKey = process.env.ACCUWEATHER_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "ACCUWEATHER_API_KEY not configured" }); return; }
  try {
    const r = await fetch(`${ACCUWEATHER_BASE}/currentconditions/v1/${req.params.locationKey}?apikey=${apiKey}`);
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: err?.message || "AccuWeather current conditions failed" });
  }
});

/** Fetch weather data for a city name (called by tool execution) */
async function resolveWeatherForCity(city: string): Promise<string | null> {
  const apiKey = process.env.ACCUWEATHER_API_KEY;
  if (!apiKey) {
    console.warn("ACCUWEATHER_API_KEY not configured");
    return null;
  }

  try {
    // Step 1: Location search
    const locRes = await fetch(`${ACCUWEATHER_BASE}/locations/v1/cities/search?apikey=${apiKey}&q=${encodeURIComponent(city)}`);
    const locations = await locRes.json();
    if (!Array.isArray(locations) || locations.length === 0) return null;
    const loc = locations[0];
    const locationKey = loc.Key;
    const locationName = `${loc.LocalizedName}, ${loc.Country?.LocalizedName || ""}`;

    // Step 2: Current conditions
    const condRes = await fetch(`${ACCUWEATHER_BASE}/currentconditions/v1/${locationKey}?apikey=${apiKey}`);
    const conditions = await condRes.json();
    if (!Array.isArray(conditions) || conditions.length === 0) return null;
    const c = conditions[0];

    return `Location: ${locationName}
Temperature: ${c.Temperature?.Metric?.Value}°C / ${c.Temperature?.Imperial?.Value}°F
Conditions: ${c.WeatherText}
Observation Time: ${c.LocalObservationDateTime}`;
  } catch (err: any) {
    console.warn("Weather resolution failed:", err?.message);
    return null;
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ API server running on http://localhost:${PORT}`);
});

