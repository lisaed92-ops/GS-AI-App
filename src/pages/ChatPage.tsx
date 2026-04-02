import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Send, Bot, ChevronDown, PlusCircle, Sparkles, Loader2, Plus, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { MODEL_OPTIONS, DEFAULT_MODEL, type KnowledgeItem, type AcceptedInput } from "../types/agent";
import { getAgents, getSkills, getChatHistory, saveChatHistory, generateId } from "../lib/storage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import factoriLogo from "../../Images/Factori_70h.png";

interface Attachment {
  name: string;
  url: string;
  type: string; // mime type
}

/** Map agent acceptedInputs to file-picker accept string */
function buildAcceptString(accepted: AcceptedInput[]): string {
  const exts: string[] = [];
  if (accepted.includes("text")) exts.push(".txt", ".md");
  if (accepted.includes("documents")) exts.push(".docx", ".txt", ".md");
  if (accepted.includes("pdfs")) exts.push(".pdf");
  if (accepted.includes("images")) exts.push(".png", ".jpg", ".jpeg", ".gif", ".webp");
  return [...new Set(exts)].join(",");
}

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load agents & skills from localStorage
  const allAgents = getAgents();
  const agents = allAgents.map((a) => ({ id: a.id, name: a.name }));
  const skills = getSkills().map((s) => ({ id: s.id, name: s.name }));

  const [selectedAgent, setSelectedAgent] = useState(() => agents.length > 0 ? agents[0].id : "");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [selectedSkill, setSelectedSkill] = useState("__all__");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive accepted inputs from selected agent
  const activeAgent = allAgents.find((a) => a.id === selectedAgent);
  const acceptedInputs: AcceptedInput[] = activeAgent?.acceptedInputs ?? ["text"];
  const acceptsFiles = acceptedInputs.some((i) => i !== "text");
  const acceptString = buildAcceptString(acceptedInputs);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        setAttachments((prev) => [...prev, { name: data.name, url: data.url, type: file.type }]);
      }
    } catch {
      alert("Failed to upload file. Make sure the backend is running.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = async (idx: number) => {
    const att = attachments[idx];
    const storedName = att.url.split("/").pop();
    if (storedName) {
      await fetch(`/api/files/${storedName}`, { method: "DELETE" }).catch(() => {});
    }
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Load chat from URL param on mount / when param changes
  useEffect(() => {
    const id = searchParams.get("chat");
    if (id) {
      const saved = getChatHistory(id);
      if (saved) {
        setChatId(saved.id);
        setMessages(saved.messages);
        return;
      }
    }
    // No valid chat param — start fresh
    setChatId(null);
    setMessages([]);
  }, [searchParams]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /** Persist the current conversation to localStorage */
  const persistChat = useCallback(
    (msgs: { role: string; content: string }[], existingId: string | null) => {
      if (msgs.length === 0) return existingId;
      const firstUserMsg = msgs.find((m) => m.role === "user");
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? "…" : "")
        : "New Chat";
      const now = new Date().toISOString();
      const id = existingId || generateId();
      saveChatHistory({ id, title, messages: msgs, createdAt: existingId ? (getChatHistory(id)?.createdAt || now) : now, updatedAt: now });
      return id;
    },
    [],
  );

  const handleNewChat = () => {
    setChatId(null);
    setMessages([]);
    setInput("");
    setAttachments([]);
    setSearchParams({});
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    // Build user message — show attachment names in the UI bubble
    const attPrefix = attachments.length > 0
      ? attachments.map((a) => `[Attached: ${a.name}]`).join(" ") + "\n"
      : "";
    const userContent = attPrefix + input;

    const userMessage = { role: "user" as const, content: userContent };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsLoading(true);

    // Add empty assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: (() => {
            const agent = allAgents.find((a) => a.id === selectedAgent);
            return agent?.systemPrompt || undefined;
          })(),
          knowledge: (() => {
            const agent = allAgents.find((a) => a.id === selectedAgent);
            return agent?.knowledge && agent.knowledge.length > 0 ? agent.knowledge : undefined;
          })(),
          mcpConnectionIds: (() => {
            const agent = allAgents.find((a) => a.id === selectedAgent);
            const agentMcps = agent?.mcpConnectionIds || [];
            const skill = selectedSkill !== "__all__" ? getSkills().find((s) => s.id === selectedSkill) : undefined;
            const skillMcps = skill?.mcpConnectionIds || [];
            const merged = [...new Set([...agentMcps, ...skillMcps])];
            return merged.length > 0 ? merged : undefined;
          })(),
          skillInstructions: (() => {
            if (selectedSkill === "__all__") return undefined;
            const skill = getSkills().find((s) => s.id === selectedSkill);
            return skill?.instructions || undefined;
          })(),
          attachments: currentAttachments.length > 0
            ? currentAttachments.map((a) => ({ name: a.name, url: a.url }))
            : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.token) {
              setMessages((prev) => {
                const updated = prev.slice(0, -1);
                const last = prev[prev.length - 1];
                if (last && last.role === "assistant") {
                  return [...updated, { ...last, content: last.content + parsed.token }];
                }
                return prev;
              });
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const updated = prev.slice(0, -1);
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant") {
          return [...updated, { ...last, content: `⚠️ Error: ${err.message || "Failed to get response"}` }];
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
      // Persist conversation after the response is complete
      setMessages((prev) => {
        const newId = persistChat(prev, chatId);
        if (newId && newId !== chatId) {
          setChatId(newId);
          setSearchParams({ chat: newId });
        }
        return prev;
      });
    }
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Messages area */}
      <div className="flex flex-1 flex-col overflow-y-auto px-8 py-6">
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <img src={factoriLogo} alt="Factori" className="mb-6 h-[70px]" />
            <h2 className="text-3xl font-bold text-white">How can I help you today?</h2>

            {/* Chat box — centered like the original design */}
            <div className="mt-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1a1a1a] p-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message here..."
                rows={3}
                className="w-full resize-none bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
              />
              {/* Attachment chips */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {attachments.map((att, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-gray-300">
                      {att.type.startsWith("image/") ? <ImageIcon size={12} /> : <FileText size={12} />}
                      <span className="max-w-[120px] truncate">{att.name}</span>
                      <button onClick={() => removeAttachment(i)} className="text-gray-500 hover:text-red-400"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                {/* Selectors + attach */}
                <div className="flex items-center gap-2">
                  {acceptsFiles && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="rounded-lg border border-white/10 bg-[#111] p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200 disabled:opacity-50"
                      title="Attach file"
                    >
                      {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                    </button>
                  )}
                  <div className="relative">
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="appearance-none rounded-lg border border-white/10 bg-[#111] py-1.5 pl-3 pr-8 text-xs text-gray-400 outline-none focus:border-blue-500/50"
                    >
                      <option value="">No Agent</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-600" />
                  </div>
                  <div className="relative">
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="appearance-none rounded-lg border border-white/10 bg-[#111] py-1.5 pl-3 pr-8 text-xs text-gray-400 outline-none focus:border-blue-500/50"
                    >
                      {MODEL_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-600" />
                  </div>
                  <div className="relative">
                    <select
                      value={selectedSkill}
                      onChange={(e) => setSelectedSkill(e.target.value)}
                      className="appearance-none rounded-lg border border-white/10 bg-[#111] py-1.5 pl-3 pr-8 text-xs text-gray-400 outline-none focus:border-blue-500/50"
                    >
                      <option value="__all__">All Skills</option>
                      {skills.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-600" />
                  </div>
                </div>
                {/* Send button */}
                <button
                  onClick={handleSend}
                  className="rounded-xl bg-blue-600 p-2.5 text-white transition-colors hover:bg-blue-700"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Action cards — styled like the original 4-card row */}
            <div className="mt-6 grid w-full max-w-2xl grid-cols-2 gap-4">
              <Link
                to="/create-agent"
                className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1a] px-6 py-5 transition-colors hover:border-white/20 hover:bg-[#222]"
              >
                <PlusCircle size={24} className="text-blue-400" />
                <span className="text-sm font-medium text-gray-300">Build an Agent</span>
              </Link>
              <Link
                to="/skills"
                className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1a] px-6 py-5 transition-colors hover:border-white/20 hover:bg-[#222]"
              >
                <Sparkles size={24} className="text-purple-400" />
                <span className="text-sm font-medium text-gray-300">Create a Skill</span>
              </Link>
            </div>
          </div>
        )}

        {/* When there are messages, show them + sticky input at bottom */}
        {messages.length > 0 && (
          <div className="mt-auto mx-auto w-full max-w-2xl space-y-4">
            {/* New Chat button */}
            <div className="flex justify-end">
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
              >
                <Plus size={14} />
                New Chat
              </button>
            </div>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "ml-auto max-w-[80%] bg-blue-600/20 text-blue-100"
                    : "mr-auto max-w-[80%] bg-[#1a1a1a] text-gray-300"
                }`}
              >
                {m.role === "assistant" ? (
                  m.content ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-table:border-collapse prose-th:border prose-th:border-white/20 prose-th:bg-white/5 prose-th:px-3 prose-th:py-1.5 prose-td:border prose-td:border-white/20 prose-td:px-3 prose-td:py-1.5 prose-p:my-1 prose-headings:text-gray-200 prose-a:text-blue-400">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    isLoading && <Loader2 size={16} className="animate-spin text-gray-500" />
                  )
                ) : (
                  m.content
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom input bar — only when in conversation */}
      {messages.length > 0 && (
        <div className="border-t border-white/10 bg-[#111] px-8 py-4">
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            {/* Attachment chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-gray-300">
                    {att.type.startsWith("image/") ? <ImageIcon size={12} /> : <FileText size={12} />}
                    <span className="max-w-[120px] truncate">{att.name}</span>
                    <button onClick={() => removeAttachment(i)} className="text-gray-500 hover:text-red-400"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            {/* Row 1: Attach + Text input + Send button */}
            <div className="flex items-end gap-2">
              {acceptsFiles && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="mb-1 rounded-xl border border-white/10 bg-[#1a1a1a] p-3 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200 disabled:opacity-50"
                  title="Attach file"
                >
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                </button>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message here..."
                rows={2}
                className="flex-1 resize-none rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500/50"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="rounded-xl bg-blue-600 p-3 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            {/* Row 2: Agent / Model / Skill selectors */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="appearance-none rounded-lg border border-white/10 bg-[#1a1a1a] py-1.5 pl-3 pr-8 text-xs text-gray-400 outline-none focus:border-blue-500/50"
                >
                  <option value="">No Agent</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-600" />
              </div>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="appearance-none rounded-lg border border-white/10 bg-[#1a1a1a] py-1.5 pl-3 pr-8 text-xs text-gray-400 outline-none focus:border-blue-500/50"
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-600" />
              </div>
              <div className="relative">
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="appearance-none rounded-lg border border-white/10 bg-[#1a1a1a] py-1.5 pl-3 pr-8 text-xs text-gray-400 outline-none focus:border-blue-500/50"
                >
                  <option value="__all__">All Skills</option>
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptString}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
